from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from core.models import Activity, Booking, PaymentIntent, Profile, RoleChoices, Room, Timeslot


User = get_user_model()


class Command(BaseCommand):
    help = "Seed planning test data (activities, rooms, timeslots, bookings, payment intents)"

    def handle(self, *args, **options):
        now = timezone.now().replace(minute=0, second=0, microsecond=0)

        admin_user = self._ensure_user("admin_demo", "admin@example.com", RoleChoices.ADMIN)
        medewerker_user = self._ensure_user("medewerker_demo", "medewerker@example.com", RoleChoices.MEDEWERKER)
        klant_user = self._ensure_user("klant_demo", "klant@example.com", RoleChoices.KLANT)

        handvormen = self._upsert_activity(
            name="Handvormen Workshop",
            description="Introductie in handvormen met klei.",
            default_duration_minutes=120,
            price=Decimal("45.00"),
        )
        draaischijf = self._upsert_activity(
            name="Draaischijf Sessie",
            description="Begeleide sessie op de draaischijf.",
            default_duration_minutes=90,
            price=Decimal("55.00"),
        )

        atelier_a = self._upsert_room(
            name="Atelier A",
            description="Lichte werkruimte met 8 werkplekken.",
            capacity=8,
        )
        atelier_b = self._upsert_room(
            name="Atelier B",
            description="Compacte werkruimte voor kleine groepen.",
            capacity=4,
        )

        self._set_default_room(handvormen, atelier_a)
        self._set_default_room(draaischijf, atelier_b)

        slot_1 = self._upsert_timeslot(
            title="Handvormen Workshop - Ochtend",
            activity=handvormen,
            room=atelier_a,
            starts_at=now + timedelta(days=1, hours=10),
            duration_minutes=120,
            capacity=8,
            created_by=medewerker_user,
            notes="Beginner niveau",
        )
        slot_2 = self._upsert_timeslot(
            title="Draaischijf Sessie - Middag",
            activity=draaischijf,
            room=atelier_b,
            starts_at=now + timedelta(days=2, hours=14),
            duration_minutes=90,
            capacity=4,
            created_by=admin_user,
            notes="Gevorderd niveau",
        )

        booking_new = self._upsert_booking(
            timeslot=slot_1,
            customer=klant_user,
            status=Booking.BookingStatus.NEW,
            notes="Eerste proefles",
        )
        booking_paid = self._upsert_booking(
            timeslot=slot_2,
            customer=klant_user,
            status=Booking.BookingStatus.PAID,
            notes="Inclusief materiaal",
        )

        self._upsert_payment_intent(
            booking=booking_paid,
            provider="mock",
            provider_reference="pi_demo_paid",
            amount=Decimal("75.00"),
            currency="EUR",
            status=PaymentIntent.PaymentStatus.PAID,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Seed complete: users=3 activities=2 rooms=2 timeslots=2 bookings=2 payment_intents=1"
            )
        )

    def _ensure_user(self, username, email, role):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
            },
        )
        if created:
            user.set_password("demo12345")
            user.save(update_fields=["password"])

        profile, _ = Profile.objects.get_or_create(user=user)
        if profile.role != role:
            profile.role = role
            profile.save(update_fields=["role"])
        return user

    def _upsert_activity(self, name, description, default_duration_minutes, price):
        slug = slugify(name)
        activity, _ = Activity.objects.update_or_create(
            slug=slug,
            defaults={
                "name": name,
                "description": description,
                "default_duration_minutes": default_duration_minutes,
                "price": price,
                "is_active": True,
            },
        )
        return activity

    def _upsert_room(self, name, description, capacity):
        slug = slugify(name)
        room, _ = Room.objects.update_or_create(
            slug=slug,
            defaults={
                "name": name,
                "description": description,
                "capacity": capacity,
                "is_active": True,
            },
        )
        return room

    def _upsert_timeslot(self, title, activity, room, starts_at, duration_minutes, capacity, created_by, notes):
        ends_at = starts_at + timedelta(minutes=duration_minutes)
        timeslot, _ = Timeslot.objects.update_or_create(
            activity=activity,
            room=room,
            starts_at=starts_at,
            defaults={
                "title": title,
                "ends_at": ends_at,
                "capacity": capacity,
                "notes": notes,
                "created_by": created_by,
            },
        )
        return timeslot

    def _upsert_booking(self, timeslot, customer, status, notes):
        booking, _ = Booking.objects.update_or_create(
            timeslot=timeslot,
            customer=customer,
            defaults={
                "status": status,
                "notes": notes,
            },
        )
        return booking

    def _upsert_payment_intent(self, booking, provider, provider_reference, amount, currency, status):
        payment_intent, _ = PaymentIntent.objects.update_or_create(
            booking=booking,
            defaults={
                "provider": provider,
                "provider_reference": provider_reference,
                "amount": amount,
                "currency": currency,
                "status": status,
            },
        )
        return payment_intent

    def _set_default_room(self, activity, room):
        if activity.default_room_id != room.id:
            activity.default_room = room
            activity.save(update_fields=["default_room"])
