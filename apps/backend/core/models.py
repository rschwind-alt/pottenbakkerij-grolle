from decimal import Decimal

import uuid

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


User = get_user_model()


class RoleChoices(models.TextChoices):
    ADMIN = "admin", "Admin"
    MEDEWERKER = "medewerker", "Medewerker"
    KLANT = "klant", "Klant"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=RoleChoices.choices, default=RoleChoices.KLANT)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"


class Product(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class AuditModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Activity(AuditModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("25.00"))
    requires_payment = models.BooleanField(default=True)
    default_duration_minutes = models.PositiveIntegerField(default=90)
    default_room = models.ForeignKey(
        "Room",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_for_activities",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Room(AuditModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    capacity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Timeslot(AuditModel):
    title = models.CharField(max_length=120)
    activity = models.ForeignKey(Activity, on_delete=models.PROTECT, related_name="timeslots")
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="timeslots")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["starts_at"]
        constraints = [
            models.UniqueConstraint(fields=["room", "starts_at", "ends_at"], name="unique_room_timespan"),
        ]

    def clean(self) -> None:
        if self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "Eindtijd moet later zijn dan starttijd."})
        if self.capacity < 1:
            raise ValidationError({"capacity": "Capaciteit moet minimaal 1 zijn."})

    @property
    def booked_count(self) -> int:
        return self.bookings.exclude(
            status__in=[Booking.BookingStatus.CANCELED, Booking.BookingStatus.NO_SHOW]
        ).aggregate(total=models.Sum("participants"))["total"] or 0

    @property
    def available_spots(self) -> int:
        return max(self.capacity - self.booked_count, 0)

    def __str__(self) -> str:
        return f"{self.title} ({self.starts_at.isoformat()})"


class Booking(AuditModel):
    class BookingStatus(models.TextChoices):
        NEW = "nieuw", "Nieuw"
        RESERVED = "gereserveerd", "Gereserveerd"
        PAID = "betaald", "Betaald"
        CANCELED = "geannuleerd", "Geannuleerd"
        NO_SHOW = "no_show", "No-show"

    timeslot = models.ForeignKey(Timeslot, on_delete=models.CASCADE, related_name="bookings")
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bookings",
        null=True,
        blank=True,
    )
    guest_name = models.CharField(max_length=120, blank=True)
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=40, blank=True)
    participants = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.NEW)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["timeslot", "customer"], name="unique_timeslot_customer_booking"),
        ]

    def clean(self) -> None:
        if (
            self.status in {self.BookingStatus.NEW, self.BookingStatus.RESERVED, self.BookingStatus.PAID}
            and self.timeslot_id
        ):
            active_bookings = Booking.objects.filter(
                timeslot=self.timeslot,
                status__in=[self.BookingStatus.NEW, self.BookingStatus.RESERVED, self.BookingStatus.PAID],
            )
            if self.pk:
                active_bookings = active_bookings.exclude(pk=self.pk)

            current_participants = active_bookings.aggregate(total=models.Sum("participants"))["total"] or 0
            if current_participants + self.participants > self.timeslot.capacity:
                raise ValidationError({"timeslot": "Dit tijdslot heeft geen vrije plekken meer."})

        if self.participants < 1:
            raise ValidationError({"participants": "Aantal deelnemers moet minimaal 1 zijn."})

    def __str__(self) -> str:
        if self.customer_id:
            who = self.customer.username
        else:
            who = self.guest_name or self.guest_email or "gast"
        return f"Boeking {self.id} - {who}"


class PaymentIntent(AuditModel):
    class PaymentStatus(models.TextChoices):
        NEW = "nieuw", "Nieuw"
        RESERVED = "gereserveerd", "Gereserveerd"
        PAID = "betaald", "Betaald"
        CANCELED = "geannuleerd", "Geannuleerd"
        FAILED = "mislukt", "Mislukt"

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="payment_intent")
    public_reference = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    provider = models.CharField(max_length=40, default="mock")
    provider_reference = models.CharField(max_length=120, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="EUR")
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.NEW)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PaymentIntent {self.provider_reference} ({self.status})"


@receiver(post_save, sender=User)
def ensure_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
