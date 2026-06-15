from decimal import Decimal

from django.db import transaction
from django.db.models import Count, IntegerField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.translation import get_language
from rest_framework import generics, parsers, permissions, serializers, status
from rest_framework.permissions import SAFE_METHODS
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .i18n import tr
from .emails import send_booking_confirmation_email, send_webshop_order_confirmation_email
from .models import Booking, PaymentIntent, Product, ProductGroup, RoleChoices, Timeslot
from .models import Activity, Room
from .payments import (
    MolliePaymentError,
    calculate_booking_amount,
    create_mollie_checkout,
    get_mollie_payment,
)
from .permissions import IsAdminOrMedewerker, IsBookingOwnerOrStaff, get_user_role
from .serializers import (
    ActivitySerializer,
    BookingSerializer,
    GuestBookingCreateSerializer,
    BookingRescheduleSerializer,
    LoginTokenSerializer,
    PlanningSlotSerializer,
    ProfileSerializer,
    RoomSerializer,
    RegisterSerializer,
    TimeslotAvailabilitySerializer,
    ProductSerializer,
    ProductGroupSerializer,
    AdminWebshopProductSerializer,
    WebshopOrderCreateSerializer,
    WebshopOrderSerializer,
)
from .throttles import GuestBookingThrottle

_ACTIVE_STATUSES = [
    Booking.BookingStatus.NEW,
    Booking.BookingStatus.RESERVED,
    Booking.BookingStatus.PAID,
]


class PaymentUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = tr(
        "Betalingen zijn tijdelijk niet beschikbaar. Probeer later opnieuw.",
        "Zahlungen sind derzeit nicht verfuegbar. Bitte spaeter erneut versuchen.",
    )
    default_code = "payment_unavailable"


class HealthcheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "service": "pottenbakkerij-grolle-backend",
                "timestamp": timezone.now(),
            }
        )


class ProductListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        products = Product.objects.filter(is_active=True)
        group_slug = request.query_params.get("group")
        if group_slug:
            products = products.filter(group__slug=group_slug, group__is_active=True)
        products = products.order_by("name")
        return Response(ProductSerializer(products, many=True).data)


class ProductGroupListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        groups = (
            ProductGroup.objects.filter(is_active=True)
            .annotate(product_count=Count("products", filter=Q(products__is_active=True), distinct=True))
            .order_by("name")
        )
        return Response(ProductGroupSerializer(groups, many=True).data)


class ProductDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug, is_active=True)
        return Response(ProductSerializer(product).data)


class WebshopOrderCreateView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = WebshopOrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        language = get_language() or request.headers.get("Accept-Language", "nl")
        send_webshop_order_confirmation_email(order, language=language)

        return Response(
            {
                "message": tr(
                    "Bestelling ontvangen. We nemen snel contact op.",
                    "Bestellung erhalten. Wir melden uns zeitnah.",
                ),
                "order": WebshopOrderSerializer(order).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminWebshopProductManageView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def _ensure_admin(self, request):
        if get_user_role(request.user) != RoleChoices.ADMIN:
            raise PermissionDenied(
                tr(
                    "Alleen admins hebben toegang tot webshop beheer.",
                    "Nur Admins haben Zugriff auf die Webshop-Verwaltung.",
                )
            )

    def get(self, request):
        self._ensure_admin(request)
        products = Product.objects.select_related("group").order_by("name")
        return Response(ProductSerializer(products, many=True).data)

    def post(self, request):
        self._ensure_admin(request)
        serializer = AdminWebshopProductSerializer(
            data=request.data,
            context={
                "request": request,
                "media_url": "/media",
            },
        )
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


class AdminWebshopProductDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def _ensure_admin(self, request):
        if get_user_role(request.user) != RoleChoices.ADMIN:
            raise PermissionDenied(
                tr(
                    "Alleen admins hebben toegang tot webshop beheer.",
                    "Nur Admins haben Zugriff auf die Webshop-Verwaltung.",
                )
            )

    def patch(self, request, pk):
        self._ensure_admin(request)
        product = get_object_or_404(Product, pk=pk)
        serializer = AdminWebshopProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={
                "request": request,
                "media_url": "/media",
            },
        )
        serializer.is_valid(raise_exception=True)
        updated_product = serializer.save()
        return Response(ProductSerializer(updated_product).data)

    def delete(self, request, pk):
        self._ensure_admin(request)
        product = get_object_or_404(Product, pk=pk)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActivityListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrMedewerker]

    def get(self, request):
        activities = Activity.objects.filter(is_active=True).order_by("name")
        return Response(ActivitySerializer(activities, many=True).data)


class RoomListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrMedewerker]

    def get(self, request):
        rooms = Room.objects.filter(is_active=True).order_by("name")
        return Response(RoomSerializer(rooms, many=True).data)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": tr("Registratie gelukt.", "Registrierung erfolgreich."),
                "user": ProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    authentication_classes = []
    permission_classes = []
    serializer_class = LoginTokenSerializer


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ProfileSerializer(request.user).data)


class RoleCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = get_user_role(request.user)
        return Response(
            {
                "role": role,
                "can_manage_planning": role in {RoleChoices.ADMIN, RoleChoices.MEDEWERKER},
            }
        )


# ---------------------------------------------------------------------------
# Timeslot: beheer (admin/medewerker) + beschikbaarheids-overzicht (iedereen)
# ---------------------------------------------------------------------------

class PlanningListCreateView(generics.ListCreateAPIView):
    serializer_class = PlanningSlotSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdminOrMedewerker()]

    def get_queryset(self):
        return (
            Timeslot.objects.select_related("activity", "room")
            .prefetch_related("bookings")
            .all()
            .order_by("starts_at")
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PlanningDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlanningSlotSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdminOrMedewerker()]

    def get_queryset(self):
        return Timeslot.objects.select_related("activity", "room").prefetch_related("bookings").all()


class TimeslotAvailabilityView(generics.ListAPIView):
    """
    GET /api/timeslots/available/
    Queryparams:
      date       YYYY-MM-DD – filter op startdatum
      date_from  YYYY-MM-DD – begindatum range
      date_to    YYYY-MM-DD – einddatum range
      activity   int (pk)   – filter op activiteit
      available  1          – alleen slots met vrije plek
    """
    authentication_classes = []
    permission_classes = []
    serializer_class = TimeslotAvailabilitySerializer

    def get_queryset(self):
        qs = (
            Timeslot.objects
            .select_related("activity", "room")
            .prefetch_related("bookings")
            .order_by("starts_at")
        )

        params = self.request.query_params
        has_date_filters = False

        date = params.get("date")
        if date:
            has_date_filters = True
            qs = qs.filter(starts_at__date=date)

        date_from = params.get("date_from")
        if date_from:
            has_date_filters = True
            qs = qs.filter(starts_at__date__gte=date_from)

        date_to = params.get("date_to")
        if date_to:
            has_date_filters = True
            qs = qs.filter(starts_at__date__lte=date_to)

        # Default to future slots only, but respect explicit date/week ranges from the UI.
        if not has_date_filters:
            qs = qs.filter(starts_at__gte=timezone.now())

        activity = params.get("activity")
        if activity:
            qs = qs.filter(activity_id=activity)

        if params.get("available") == "1":
            # exclude fully booked slots via annotation to avoid N+1
            from django.db.models import Q
            qs = qs.annotate(
                active_bookings=Coalesce(
                    Sum(
                        "bookings__participants",
                        filter=Q(bookings__status__in=_ACTIVE_STATUSES),
                    ),
                    Value(0),
                    output_field=IntegerField(),
                )
            ).filter(active_bookings__lt=models_capacity_ref())

        return qs


def models_capacity_ref():
    from django.db.models import F
    return F("capacity")


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

class BookingPaymentFlowMixin:
    @transaction.atomic
    def _create_payment_booking(self, serializer, customer=None, guest_data=None):
        timeslot = serializer.validated_data["timeslot"]
        requested_participants = serializer.validated_data.get("participants", 1)

        locked_timeslot = Timeslot.objects.select_for_update().get(pk=timeslot.pk)
        active_participants = Booking.objects.filter(
            timeslot=locked_timeslot,
            status__in=_ACTIVE_STATUSES,
        ).aggregate(total=Sum("participants"))["total"] or 0

        if active_participants + requested_participants > locked_timeslot.capacity:
            raise ValidationError(
                {
                    "timeslot": tr(
                        "Dit tijdslot is volgeboekt.",
                        "Dieses Zeitfenster ist ausgebucht.",
                    )
                }
            )

        requires_payment = bool(locked_timeslot.activity.requires_payment)
        booking = serializer.save(
            customer=customer,
            timeslot=locked_timeslot,
            status=Booking.BookingStatus.RESERVED if requires_payment else Booking.BookingStatus.NEW,
            **(guest_data or {}),
        )

        if not requires_payment:
            language = get_language() or "nl"
            send_booking_confirmation_email(booking, language=language)
            return booking, None, None

        if booking.timeslot.activity.price <= 0:
            raise ValidationError(
                {
                    "timeslot": tr(
                        "Er is geen prijs ingesteld voor deze activiteit.",
                        "Fuer diese Aktivitaet ist kein Preis hinterlegt.",
                    )
                }
            )

        payment_amount = calculate_booking_amount(booking)
        payment_intent = PaymentIntent.objects.create(
            booking=booking,
            provider="mollie",
            provider_reference=f"pending-{booking.id}",
            amount=payment_amount,
            currency="EUR",
            status=PaymentIntent.PaymentStatus.NEW,
        )

        try:
            payment_data = create_mollie_checkout(booking, payment_intent.public_reference)
        except MolliePaymentError as exc:
            raise PaymentUnavailable() from exc
        payment_intent.provider_reference = payment_data["payment_id"]
        payment_intent.status = PaymentIntent.PaymentStatus.RESERVED
        payment_intent.save(update_fields=["provider_reference", "status", "amount", "updated_at"])

        return booking, payment_intent, payment_data["checkout_url"]


class BookingListCreateView(BookingPaymentFlowMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get_queryset(self):
        role = get_user_role(self.request.user)
        if role in {RoleChoices.ADMIN, RoleChoices.MEDEWERKER}:
            return Booking.objects.select_related("timeslot", "customer").all()
        return Booking.objects.select_related("timeslot", "customer").filter(customer=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking, payment_intent, checkout_url = self._create_payment_booking(
            serializer,
            customer=request.user,
        )

        return Response(
            {
                "booking": BookingSerializer(booking).data,
                "payment": {
                    "required": bool(payment_intent),
                    **(
                        {
                            "public_reference": str(payment_intent.public_reference),
                            "payment_id": payment_intent.provider_reference,
                            "checkout_url": checkout_url,
                            "amount": f"{payment_intent.amount:.2f}",
                            "currency": payment_intent.currency,
                            "status": payment_intent.status,
                        }
                        if payment_intent
                        else {}
                    ),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class GuestBookingCreateView(BookingPaymentFlowMixin, generics.CreateAPIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [GuestBookingThrottle]
    serializer_class = GuestBookingCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking, payment_intent, checkout_url = self._create_payment_booking(
            serializer,
            customer=None,
            guest_data={
                "guest_name": serializer.validated_data.get("guest_name", ""),
                "guest_email": serializer.validated_data.get("guest_email", ""),
                "guest_phone": serializer.validated_data.get("guest_phone", ""),
            },
        )

        return Response(
            {
                "booking": BookingSerializer(booking).data,
                "payment": {
                    "required": bool(payment_intent),
                    **(
                        {
                            "public_reference": str(payment_intent.public_reference),
                            "payment_id": payment_intent.provider_reference,
                            "checkout_url": checkout_url,
                            "amount": f"{payment_intent.amount:.2f}",
                            "currency": payment_intent.currency,
                            "status": payment_intent.status,
                        }
                        if payment_intent
                        else {}
                    ),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class MollieWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        payment_id = request.data.get("id") or request.POST.get("id")
        if not payment_id:
            return Response({"detail": "Missing payment id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = (
                PaymentIntent.objects.select_for_update()
                .select_related("booking__timeslot__activity", "booking__timeslot__room")
                .get(provider_reference=payment_id)
            )
        except PaymentIntent.DoesNotExist:
            return Response({"detail": "Unknown payment."}, status=status.HTTP_200_OK)

        booking = payment.booking
        previous_booking_status = booking.status

        try:
            mollie_payment = get_mollie_payment(payment.provider_reference)
        except MolliePaymentError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        mollie_status = mollie_payment.get("status")

        if mollie_status == "paid":
            payment.status = PaymentIntent.PaymentStatus.PAID
            booking.status = Booking.BookingStatus.PAID
            payment.save(update_fields=["status", "updated_at"])
            booking.save(update_fields=["status", "updated_at"])
            if previous_booking_status != Booking.BookingStatus.PAID:
                language = get_language() or "nl"
                send_booking_confirmation_email(booking, language=language)
        elif mollie_status in {"canceled", "expired"}:
            payment.status = PaymentIntent.PaymentStatus.CANCELED
            payment.save(update_fields=["status", "updated_at"])
            if booking.status != Booking.BookingStatus.CANCELED:
                booking.status = Booking.BookingStatus.CANCELED
                booking.save(update_fields=["status", "updated_at"])
        elif mollie_status == "failed":
            payment.status = PaymentIntent.PaymentStatus.FAILED
            payment.save(update_fields=["status", "updated_at"])

        return Response({"ok": True})


class PaymentStatusView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, public_reference):
        payment = PaymentIntent.objects.select_related("booking__timeslot__activity", "booking__timeslot__room", "booking__customer").get(
            public_reference=public_reference
        )
        booking = payment.booking
        return Response(
            {
                "public_reference": str(payment.public_reference),
                "payment_id": payment.provider_reference,
                "payment_status": payment.status,
                "booking_status": payment.booking.status,
                "amount": f"{payment.amount:.2f}",
                "currency": payment.currency,
                "booking": BookingSerializer(booking).data,
                "booking_id": booking.id,
                "activity_name": booking.timeslot.activity.name,
                "slot_title": booking.timeslot.title,
                "starts_at": booking.timeslot.starts_at.isoformat(),
                "ends_at": booking.timeslot.ends_at.isoformat(),
                "participants": booking.participants,
                "contact_name": booking.guest_name or getattr(booking.customer, "get_full_name", lambda: "")() or getattr(booking.customer, "username", "") or "",
            }
        )


class BookingDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, IsBookingOwnerOrStaff]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return Booking.objects.select_related("timeslot", "customer").all()

    def get_object(self):
        booking = super().get_object()
        role = get_user_role(self.request.user)
        if role == RoleChoices.KLANT and booking.customer_id != self.request.user.id:
            raise PermissionDenied(
                tr(
                    "Je mag alleen je eigen boekingen bekijken.",
                    "Du darfst nur deine eigenen Buchungen ansehen.",
                )
            )
        return booking


class MyBookingsView(generics.ListAPIView):
    """GET /api/bookings/mine/ – eigen boekingen van de ingelogde klant."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return (
            Booking.objects
            .select_related("timeslot__activity", "timeslot__room", "customer")
            .filter(customer=self.request.user)
            .order_by("-created_at")
        )


class BookingCancelView(APIView):
    """POST /api/bookings/<pk>/cancel/ – annuleer een boeking."""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            booking = (
                Booking.objects.select_for_update()
                .select_related("timeslot")
                .get(pk=pk)
            )
        except Booking.DoesNotExist:
            return Response(
                {"detail": tr("Boeking niet gevonden.", "Buchung nicht gefunden.")},
                status=status.HTTP_404_NOT_FOUND,
            )

        role = get_user_role(request.user)
        if role == RoleChoices.KLANT and booking.customer_id != request.user.id:
            raise PermissionDenied(
                tr(
                    "Je mag alleen je eigen boeking annuleren.",
                    "Du darfst nur deine eigene Buchung stornieren.",
                )
            )

        if booking.status == Booking.BookingStatus.CANCELED:
            return Response(
                {"detail": tr("Boeking is al geannuleerd.", "Die Buchung wurde bereits storniert.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.BookingStatus.CANCELED
        booking.save(update_fields=["status", "updated_at"])
        return Response(BookingSerializer(booking).data)


class BookingRescheduleView(APIView):
    """POST /api/bookings/<pk>/reschedule/ – verplaats naar een ander tijdslot."""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            booking = (
                Booking.objects.select_for_update()
                .select_related("timeslot")
                .get(pk=pk)
            )
        except Booking.DoesNotExist:
            return Response(
                {"detail": tr("Boeking niet gevonden.", "Buchung nicht gefunden.")},
                status=status.HTTP_404_NOT_FOUND,
            )

        role = get_user_role(request.user)
        if role == RoleChoices.KLANT and booking.customer_id != request.user.id:
            raise PermissionDenied(
                tr(
                    "Je mag alleen je eigen boeking verplaatsen.",
                    "Du darfst nur deine eigene Buchung verschieben.",
                )
            )

        if booking.status in {Booking.BookingStatus.CANCELED, Booking.BookingStatus.NO_SHOW}:
            return Response(
                {
                    "detail": tr(
                        "Geannuleerde of no-show boekingen kunnen niet worden verplaatst.",
                        "Stornierte oder No-Show-Buchungen koennen nicht verschoben werden.",
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BookingRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_timeslot_id = serializer.validated_data["timeslot_id"]

        try:
            new_timeslot = Timeslot.objects.select_for_update().get(pk=new_timeslot_id)
        except Timeslot.DoesNotExist:
            return Response(
                {"detail": tr("Tijdslot niet gevonden.", "Zeitfenster nicht gefunden.")},
                status=status.HTTP_404_NOT_FOUND,
            )

        if new_timeslot.pk == booking.timeslot_id:
            return Response(
                {
                    "detail": tr(
                        "Boeking staat al op dit tijdslot.",
                        "Die Buchung ist bereits diesem Zeitfenster zugeordnet.",
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Duplicate check on new timeslot for this customer
        if Booking.objects.filter(
            timeslot=new_timeslot,
            customer=booking.customer,
            status__in=_ACTIVE_STATUSES,
        ).exists():
            return Response(
                {
                    "detail": tr(
                        "Je hebt al een boeking op het nieuwe tijdslot.",
                        "Du hast bereits eine Buchung im neuen Zeitfenster.",
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Capacity check on new timeslot
        active_participants = Booking.objects.filter(
            timeslot=new_timeslot,
            status__in=_ACTIVE_STATUSES,
        ).aggregate(total=Sum("participants"))["total"] or 0
        if active_participants + booking.participants > new_timeslot.capacity:
            return Response(
                {
                    "detail": tr(
                        "Het nieuwe tijdslot is volgeboekt.",
                        "Das neue Zeitfenster ist ausgebucht.",
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.timeslot = new_timeslot
        booking.save(update_fields=["timeslot", "updated_at"])
        return Response(BookingSerializer(booking).data)
