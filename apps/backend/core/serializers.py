from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.db.models import Sum

from .i18n import tr
from .models import Activity, Booking, Room, Timeslot, Profile, RoleChoices
from .permissions import get_user_role

_ACTIVE_STATUSES = [
    Booking.BookingStatus.NEW,
    Booking.BookingStatus.RESERVED,
    Booking.BookingStatus.PAID,
]

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                tr(
                    "Deze gebruikersnaam is al in gebruik.",
                    "Dieser Benutzername wird bereits verwendet.",
                )
            )
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                tr(
                    "Dit e-mailadres is al in gebruik.",
                    "Diese E-Mail-Adresse wird bereits verwendet.",
                )
            )
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = RoleChoices.KLANT
        profile.save(update_fields=["role"])
        return user


class ProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role"]

    def get_role(self, obj):
        return get_user_role(obj)


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "default_duration_minutes",
            "default_room",
            "is_active",
        ]


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ["id", "name", "slug", "description", "capacity", "is_active"]


class LoginTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = get_user_role(user)
        token["username"] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = ProfileSerializer(self.user).data
        return data


class TimeslotAvailabilitySerializer(serializers.ModelSerializer):
    activity_name = serializers.CharField(source="activity.name", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)
    available_spots = serializers.SerializerMethodField()
    booked_count = serializers.SerializerMethodField()

    class Meta:
        model = Timeslot
        fields = [
            "id",
            "title",
            "activity",
            "activity_name",
            "room",
            "room_name",
            "starts_at",
            "ends_at",
            "capacity",
            "available_spots",
            "booked_count",
        ]

    def get_booked_count(self, obj):
        # Use annotated value when available (from filtered queryset)
        if hasattr(obj, "active_bookings"):
            return obj.active_bookings
        return obj.bookings.filter(status__in=_ACTIVE_STATUSES).aggregate(total=Sum("participants"))["total"] or 0

    def get_available_spots(self, obj):
        return max(obj.capacity - self.get_booked_count(obj), 0)


class BookingRescheduleSerializer(serializers.Serializer):
    timeslot_id = serializers.IntegerField()

    def validate_timeslot_id(self, value):
        if not Timeslot.objects.filter(pk=value).exists():
            raise serializers.ValidationError(
                tr("Tijdslot niet gevonden.", "Zeitfenster nicht gefunden.")
            )
        return value


class PlanningSlotSerializer(serializers.ModelSerializer):
    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), required=False, allow_null=True)
    booked_count = serializers.SerializerMethodField()
    available_spots = serializers.SerializerMethodField()

    def to_internal_value(self, data):
        payload = data.copy() if hasattr(data, "copy") else dict(data)
        room_value = payload.get("room")
        if room_value in [None, ""]:
            activity_obj = None
            activity_id = payload.get("activity")
            if activity_id:
                activity_obj = Activity.objects.filter(pk=activity_id).first()
            elif self.instance:
                activity_obj = getattr(self.instance, "activity", None)

            if activity_obj and activity_obj.default_room_id:
                payload["room"] = activity_obj.default_room_id

        return super().to_internal_value(payload)

    class Meta:
        model = Timeslot
        fields = [
            "id",
            "title",
            "activity",
            "room",
            "starts_at",
            "ends_at",
            "capacity",
            "notes",
            "booked_count",
            "available_spots",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_booked_count(self, obj):
        if hasattr(obj, "active_bookings"):
            return obj.active_bookings
        return obj.bookings.exclude(
            status__in=[Booking.BookingStatus.CANCELED, Booking.BookingStatus.NO_SHOW]
        ).aggregate(total=Sum("participants"))["total"] or 0

    def get_available_spots(self, obj):
        return max(obj.capacity - self.get_booked_count(obj), 0)

    def validate(self, attrs):
        activity = attrs.get("activity", getattr(self.instance, "activity", None))
        has_existing_room = bool(getattr(self.instance, "room_id", None))
        if attrs.get("room") is None and activity and activity.default_room:
            attrs["room"] = activity.default_room

        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        capacity = attrs.get("capacity", getattr(self.instance, "capacity", None))

        if attrs.get("room") is None and not has_existing_room:
            raise serializers.ValidationError(
                {
                    "room": tr(
                        "Kies een ruimte of stel een standaardruimte in op de activiteit.",
                        "Waehle einen Raum oder hinterlege einen Standardraum fuer die Aktivitaet.",
                    )
                }
            )

        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError(
                {
                    "ends_at": tr(
                        "Eindtijd moet later zijn dan starttijd.",
                        "Die Endzeit muss nach der Startzeit liegen.",
                    )
                }
            )
        if capacity is not None and capacity < 1:
            raise serializers.ValidationError(
                {
                    "capacity": tr(
                        "Capaciteit moet minimaal 1 zijn.",
                        "Die Kapazitaet muss mindestens 1 sein.",
                    )
                }
            )
        return attrs


class BookingSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "timeslot",
            "customer_id",
            "guest_name",
            "guest_email",
            "guest_phone",
            "participants",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "customer_id", "created_at", "updated_at"]

    def validate_timeslot(self, value):
        if value.ends_at <= value.starts_at:
            raise serializers.ValidationError(
                tr(
                    "Dit planningsslot is ongeldig.",
                    "Dieses Planungszeitfenster ist ungueltig.",
                )
            )
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                tr(
                    "Ingelogde gebruiker vereist.",
                    "Ein angemeldeter Benutzer ist erforderlich.",
                )
            )

        role = get_user_role(request.user)
        if role not in {RoleChoices.ADMIN, RoleChoices.MEDEWERKER, RoleChoices.KLANT}:
            raise serializers.ValidationError(
                tr(
                    "Onbekende rol. Neem contact op met beheer.",
                    "Unbekannte Rolle. Bitte kontaktiere die Verwaltung.",
                )
            )

        timeslot = attrs.get("timeslot")
        requested_participants = attrs.get("participants", getattr(self.instance, "participants", 1))
        if requested_participants < 1:
            raise serializers.ValidationError(
                {
                    "participants": tr(
                        "Aantal deelnemers moet minimaal 1 zijn.",
                        "Die Teilnehmeranzahl muss mindestens 1 sein.",
                    )
                }
            )

        if timeslot and Booking.objects.filter(timeslot=timeslot, customer=request.user).exists():
            raise serializers.ValidationError(
                tr(
                    "Je hebt deze boeking al gemaakt.",
                    "Du hast diese Buchung bereits erstellt.",
                )
            )

        if timeslot:
            active_participants = Booking.objects.filter(
                timeslot=timeslot,
                status__in=[
                    Booking.BookingStatus.NEW,
                    Booking.BookingStatus.RESERVED,
                    Booking.BookingStatus.PAID,
                ],
            ).aggregate(total=Sum("participants"))["total"] or 0
            if active_participants + requested_participants > timeslot.capacity:
                raise serializers.ValidationError(
                    {
                        "timeslot": tr(
                            "Dit tijdslot is volgeboekt.",
                            "Dieses Zeitfenster ist ausgebucht.",
                        )
                    }
                )

        requested_status = attrs.get("status", Booking.BookingStatus.NEW)
        if requested_status == Booking.BookingStatus.NO_SHOW and role == RoleChoices.KLANT:
            raise serializers.ValidationError(
                {
                    "status": tr(
                        "Klant mag status no-show niet instellen.",
                        "Kunden duerfen den Status No-Show nicht setzen.",
                    )
                }
            )
        return attrs


class GuestBookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            "id",
            "timeslot",
            "guest_name",
            "guest_email",
            "guest_phone",
            "participants",
            "notes",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def validate_guest_name(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                tr(
                    "Vul een contactnaam in.",
                    "Bitte gib einen Kontaktnamen ein.",
                )
            )
        return value.strip()

    def validate_guest_email(self, value):
        normalized = value.strip().lower()
        if not normalized:
            raise serializers.ValidationError(
                tr(
                    "Vul een e-mailadres in.",
                    "Bitte gib eine E-Mail-Adresse ein.",
                )
            )
        return normalized

    def validate(self, attrs):
        timeslot = attrs.get("timeslot")
        guest_email = attrs.get("guest_email", "").strip().lower()
        requested_participants = attrs.get("participants", 1)
        if requested_participants < 1:
            raise serializers.ValidationError(
                {
                    "participants": tr(
                        "Aantal deelnemers moet minimaal 1 zijn.",
                        "Die Teilnehmeranzahl muss mindestens 1 sein.",
                    )
                }
            )

        if timeslot and Booking.objects.filter(timeslot=timeslot, guest_email__iexact=guest_email).exclude(
            status__in=[Booking.BookingStatus.CANCELED, Booking.BookingStatus.NO_SHOW]
        ).exists():
            raise serializers.ValidationError(
                tr(
                    "Er bestaat al een gastboeking met dit e-mailadres voor dit tijdslot.",
                    "Es gibt bereits eine Gastbuchung mit dieser E-Mail-Adresse fuer dieses Zeitfenster.",
                )
            )

        if timeslot:
            active_participants = Booking.objects.filter(
                timeslot=timeslot,
                status__in=[
                    Booking.BookingStatus.NEW,
                    Booking.BookingStatus.RESERVED,
                    Booking.BookingStatus.PAID,
                ],
            ).aggregate(total=Sum("participants"))["total"] or 0
            if active_participants + requested_participants > timeslot.capacity:
                raise serializers.ValidationError(
                    {
                        "timeslot": tr(
                            "Dit tijdslot is volgeboekt.",
                            "Dieses Zeitfenster ist ausgebucht.",
                        )
                    }
                )

        return attrs
