from django.db import transaction
from django.db.models import IntegerField, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.permissions import SAFE_METHODS
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView

from .i18n import tr
from .models import Booking, Product, RoleChoices, Timeslot
from .models import Activity, Room
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
)
from .throttles import GuestBookingThrottle

_ACTIVE_STATUSES = [
    Booking.BookingStatus.NEW,
    Booking.BookingStatus.RESERVED,
    Booking.BookingStatus.PAID,
]


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


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "slug", "description", "price", "is_active"]


class ProductListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        products = Product.objects.filter(is_active=True).order_by("name")
        return Response(ProductSerializer(products, many=True).data)


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

class BookingListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get_queryset(self):
        role = get_user_role(self.request.user)
        if role in {RoleChoices.ADMIN, RoleChoices.MEDEWERKER}:
            return Booking.objects.select_related("timeslot", "customer").all()
        return Booking.objects.select_related("timeslot", "customer").filter(customer=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        timeslot = serializer.validated_data["timeslot"]
        requested_participants = serializer.validated_data.get("participants", 1)
        # Row-level lock on the timeslot row to prevent concurrent overbooking
        locked_timeslot = (
            Timeslot.objects.select_for_update().get(pk=timeslot.pk)
        )
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
        serializer.save(customer=self.request.user, timeslot=locked_timeslot)


class GuestBookingCreateView(generics.CreateAPIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [GuestBookingThrottle]
    serializer_class = GuestBookingCreateSerializer

    @transaction.atomic
    def perform_create(self, serializer):
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

        serializer.save(timeslot=locked_timeslot, customer=None, status=Booking.BookingStatus.NEW)


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
