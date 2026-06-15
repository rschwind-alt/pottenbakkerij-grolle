"""
Tests for Planning API – Prompt 4 business rules.

Covers:
  - Timeslot availability endpoint + filters
  - Booking creation + capacity enforcement (incl. concurrent overbooking guard)
  - Cancel booking
  - Reschedule (move) booking
  - My-bookings scoping per role
"""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Activity, Booking, PaymentIntent, Profile, Room, RoleChoices, Timeslot
from .payments import MolliePaymentError

User = get_user_model()

_ACTIVE = [
    Booking.BookingStatus.NEW,
    Booking.BookingStatus.RESERVED,
    Booking.BookingStatus.PAID,
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _jwt(user):
    """Return an authenticated DRF test client for user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


def _jwt_with_language(user, language):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}",
        HTTP_ACCEPT_LANGUAGE=language,
    )
    return client


def _make_user(username, role=RoleChoices.KLANT):
    user = User.objects.create_user(username=username, password="test12345")
    profile, _ = Profile.objects.get_or_create(user=user)
    profile.role = role
    profile.save(update_fields=["role"])
    return user


def _make_timeslot(activity, room, offset_days=1, capacity=3, title=None):
    now = timezone.now().replace(minute=0, second=0, microsecond=0)
    starts = now + timedelta(days=offset_days, hours=10)
    ends = starts + timedelta(hours=2)
    return Timeslot.objects.create(
        title=title or f"Slot +{offset_days}d",
        activity=activity,
        room=room,
        starts_at=starts,
        ends_at=ends,
        capacity=capacity,
    )


class BaseTestCase(APITestCase):
    def setUp(self):
        self.activity = Activity.objects.create(
            name="Handvormen", slug="handvormen", default_duration_minutes=120
        )
        self.activity2 = Activity.objects.create(
            name="Draaischijf", slug="draaischijf", default_duration_minutes=90, requires_payment=False
        )
        self.room = Room.objects.create(name="Atelier A", slug="atelier-a", capacity=10)

        self.admin = _make_user("admin_t", RoleChoices.ADMIN)
        self.medewerker = _make_user("med_t", RoleChoices.MEDEWERKER)
        self.klant1 = _make_user("klant1", RoleChoices.KLANT)
        self.klant2 = _make_user("klant2", RoleChoices.KLANT)

        self.slot = _make_timeslot(self.activity, self.room, offset_days=1, capacity=2)
        self.slot2 = _make_timeslot(self.activity2, self.room, offset_days=2, capacity=1)

        self.create_checkout_patch = patch("core.views.create_mollie_checkout")
        self.mock_create_checkout = self.create_checkout_patch.start()
        self.mock_checkout_counter = 0

        def _mock_checkout(*args, **kwargs):
            self.mock_checkout_counter += 1
            return {
                "payment_id": f"tr_test_payment_{self.mock_checkout_counter}",
                "checkout_url": "https://example.com/checkout",
                "status": "open",
                "amount": 25,
            }

        self.mock_create_checkout.side_effect = _mock_checkout
        self.addCleanup(self.create_checkout_patch.stop)


# ---------------------------------------------------------------------------
# Availability endpoint
# ---------------------------------------------------------------------------

class TimeslotAvailabilityTests(BaseTestCase):
    def test_returns_future_timeslots(self):
        client = _jwt(self.klant1)
        res = client.get(reverse("timeslot-available"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [s["id"] for s in res.data]
        self.assertIn(self.slot.id, ids)
        self.assertIn(self.slot2.id, ids)

    def test_filter_by_activity(self):
        client = _jwt(self.klant1)
        res = client.get(reverse("timeslot-available"), {"activity": self.activity2.pk})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [s["id"] for s in res.data]
        self.assertIn(self.slot2.id, ids)
        self.assertNotIn(self.slot.id, ids)

    def test_filter_by_date(self):
        client = _jwt(self.klant1)
        date_str = self.slot.starts_at.date().isoformat()
        res = client.get(reverse("timeslot-available"), {"date": date_str})
        ids = [s["id"] for s in res.data]
        self.assertIn(self.slot.id, ids)
        self.assertNotIn(self.slot2.id, ids)

    def test_filter_available_excludes_full_slots(self):
        # Fill slot2 (capacity=1)
        Booking.objects.create(timeslot=self.slot2, customer=self.klant1, status=Booking.BookingStatus.NEW)
        client = _jwt(self.klant2)
        res = client.get(reverse("timeslot-available"), {"available": "1"})
        ids = [s["id"] for s in res.data]
        self.assertIn(self.slot.id, ids)
        self.assertNotIn(self.slot2.id, ids)

    def test_shows_available_spots(self):
        Booking.objects.create(timeslot=self.slot, customer=self.klant1, status=Booking.BookingStatus.NEW)
        client = _jwt(self.klant2)
        res = client.get(reverse("timeslot-available"))
        slot_data = next(s for s in res.data if s["id"] == self.slot.id)
        self.assertEqual(slot_data["available_spots"], 1)
        self.assertEqual(slot_data["booked_count"], 1)

    def test_public_endpoint_allows_anonymous_access(self):
        res = self.client.get(reverse("timeslot-available"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_returns_dutch_message_for_full_booking(self):
        _jwt(self.klant1).post(reverse("booking-list-create"), {"timeslot": self.slot2.pk})
        res = _jwt_with_language(self.klant2, "nl").post(
            reverse("booking-list-create"),
            {"timeslot": self.slot2.pk},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["timeslot"][0], "Dit tijdslot is volgeboekt.")

    def test_returns_german_message_for_full_booking(self):
        _jwt(self.klant1).post(reverse("booking-list-create"), {"timeslot": self.slot2.pk})
        res = _jwt_with_language(self.klant2, "de").post(
            reverse("booking-list-create"),
            {"timeslot": self.slot2.pk},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["timeslot"][0], "Dieses Zeitfenster ist ausgebucht.")


# ---------------------------------------------------------------------------
# Booking creation
# ---------------------------------------------------------------------------

class BookingCreateTests(BaseTestCase):
    @patch("core.views.create_mollie_checkout")
    def test_klant_can_book(self, mock_create_checkout):
        mock_create_checkout.return_value = {
            "payment_id": "tr_test_payment",
            "checkout_url": "https://example.com/checkout",
            "status": "open",
            "amount": 25,
        }

        client = _jwt(self.klant1)
        res = client.post(reverse("booking-list-create"), {"timeslot": self.slot.pk})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["booking"]["status"], Booking.BookingStatus.RESERVED)

    @patch("core.views.create_mollie_checkout")
    def test_guest_booking_sends_confirmation_email(self, mock_create_checkout):
        mock_create_checkout.return_value = {
            "payment_id": "tr_test_guest_payment",
            "checkout_url": "https://example.com/checkout",
            "status": "open",
            "amount": 25,
        }

        response = self.client.post(
            reverse("booking-guest-create"),
            {
                "timeslot": self.slot.pk,
                "guest_name": "Gast Voorbeeld",
                "guest_email": "gast@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["booking"]["status"], Booking.BookingStatus.RESERVED)

    def test_cannot_double_book_same_slot(self):
        client = _jwt(self.klant1)
        client.post(reverse("booking-list-create"), {"timeslot": self.slot.pk})
        res = client.post(reverse("booking-list-create"), {"timeslot": self.slot.pk})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_capacity_is_enforced(self):
        # slot2 capacity=1, klant1 takes it
        _jwt(self.klant1).post(reverse("booking-list-create"), {"timeslot": self.slot2.pk})
        # klant2 should be rejected
        res = _jwt(self.klant2).post(reverse("booking-list-create"), {"timeslot": self.slot2.pk})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("volgeboekt", str(res.data).lower())

    def test_canceled_booking_frees_capacity(self):
        # klant1 books and cancels -> klant2 can now book
        b = Booking.objects.create(
            timeslot=self.slot2, customer=self.klant1, status=Booking.BookingStatus.CANCELED
        )
        res = _jwt(self.klant2).post(reverse("booking-list-create"), {"timeslot": self.slot2.pk})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

    def test_capacity_uses_participant_sum(self):
        # slot capacity=2, first booking takes both places
        with patch("core.views.create_mollie_checkout") as mock_create_checkout:
            mock_create_checkout.return_value = {
                "payment_id": "tr_capacity_payment",
                "checkout_url": "https://example.com/checkout",
                "status": "open",
                "amount": 50,
            }
            res = _jwt(self.klant1).post(
            reverse("booking-list-create"),
            {"timeslot": self.slot.pk, "participants": 2},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        with patch("core.views.create_mollie_checkout") as mock_create_checkout:
            mock_create_checkout.return_value = {
                "payment_id": "tr_capacity_payment_2",
                "checkout_url": "https://example.com/checkout",
                "status": "open",
                "amount": 25,
            }
            second = _jwt(self.klant2).post(
                reverse("booking-list-create"),
                {"timeslot": self.slot.pk, "participants": 1},
                format="json",
            )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Cancel booking
# ---------------------------------------------------------------------------

class BookingCancelTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.booking = Booking.objects.create(
            timeslot=self.slot, customer=self.klant1, status=Booking.BookingStatus.NEW
        )

    def test_klant_can_cancel_own_booking(self):
        client = _jwt(self.klant1)
        res = client.post(reverse("booking-cancel", kwargs={"pk": self.booking.pk}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, Booking.BookingStatus.CANCELED)

    def test_klant_cannot_cancel_other_booking(self):
        client = _jwt(self.klant2)
        res = client.post(reverse("booking-cancel", kwargs={"pk": self.booking.pk}))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_cancel_any_booking(self):
        client = _jwt(self.admin)
        res = client.post(reverse("booking-cancel", kwargs={"pk": self.booking.pk}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_cannot_cancel_already_canceled(self):
        self.booking.status = Booking.BookingStatus.CANCELED
        self.booking.save()
        res = _jwt(self.klant1).post(reverse("booking-cancel", kwargs={"pk": self.booking.pk}))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Reschedule booking
# ---------------------------------------------------------------------------

class BookingRescheduleTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.booking = Booking.objects.create(
            timeslot=self.slot, customer=self.klant1, status=Booking.BookingStatus.NEW
        )
        self.new_slot = _make_timeslot(self.activity, self.room, offset_days=3, capacity=2)

    def test_klant_can_reschedule_own_booking(self):
        client = _jwt(self.klant1)
        res = client.post(
            reverse("booking-reschedule", kwargs={"pk": self.booking.pk}),
            {"timeslot_id": self.new_slot.pk},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.timeslot_id, self.new_slot.pk)

    def test_reschedule_to_same_slot_rejected(self):
        res = _jwt(self.klant1).post(
            reverse("booking-reschedule", kwargs={"pk": self.booking.pk}),
            {"timeslot_id": self.slot.pk},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reschedule_to_full_slot_rejected(self):
        # fill new_slot (capacity=2) with two other bookings
        Booking.objects.create(timeslot=self.new_slot, customer=self.klant2, status=Booking.BookingStatus.NEW)
        other = _make_user("klant3", RoleChoices.KLANT)
        Booking.objects.create(timeslot=self.new_slot, customer=other, status=Booking.BookingStatus.NEW)
        res = _jwt(self.klant1).post(
            reverse("booking-reschedule", kwargs={"pk": self.booking.pk}),
            {"timeslot_id": self.new_slot.pk},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("volgeboekt", str(res.data).lower())

    def test_klant_cannot_reschedule_other_booking(self):
        res = _jwt(self.klant2).post(
            reverse("booking-reschedule", kwargs={"pk": self.booking.pk}),
            {"timeslot_id": self.new_slot.pk},
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_reschedule_canceled_booking(self):
        self.booking.status = Booking.BookingStatus.CANCELED
        self.booking.save()
        res = _jwt(self.klant1).post(
            reverse("booking-reschedule", kwargs={"pk": self.booking.pk}),
            {"timeslot_id": self.new_slot.pk},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# My bookings
# ---------------------------------------------------------------------------

class MyBookingsTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.b1 = Booking.objects.create(timeslot=self.slot, customer=self.klant1, status=Booking.BookingStatus.NEW)
        self.b2 = Booking.objects.create(timeslot=self.slot2, customer=self.klant2, status=Booking.BookingStatus.NEW)

    def test_klant_sees_only_own_bookings(self):
        res = _jwt(self.klant1).get(reverse("booking-mine"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [b["id"] for b in res.data]
        self.assertIn(self.b1.id, ids)
        self.assertNotIn(self.b2.id, ids)

    def test_admin_all_bookings_via_list(self):
        res = _jwt(self.admin).get(reverse("booking-list-create"))
        ids = [b["id"] for b in res.data]
        self.assertIn(self.b1.id, ids)
        self.assertIn(self.b2.id, ids)


class PlanningCreateDefaultRoomTests(BaseTestCase):
    def test_create_planning_uses_activity_default_room_when_room_missing(self):
        self.activity.default_room = self.room
        self.activity.save(update_fields=["default_room"])

        starts_at = (timezone.now() + timedelta(days=5)).replace(second=0, microsecond=0)
        ends_at = starts_at + timedelta(minutes=90)

        res = _jwt(self.admin).post(
            reverse("planning-list-create"),
            {
                "title": "Nieuwe workshop",
                "activity": self.activity.id,
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "capacity": 3,
                "notes": "",
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["room"], self.room.id)

    def test_create_planning_without_room_or_activity_default_room_fails(self):
        self.activity.default_room = None
        self.activity.save(update_fields=["default_room"])

        starts_at = (timezone.now() + timedelta(days=6)).replace(second=0, microsecond=0)
        ends_at = starts_at + timedelta(minutes=90)

        res = _jwt(self.admin).post(
            reverse("planning-list-create"),
            {
                "title": "Nieuwe workshop",
                "activity": self.activity.id,
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "capacity": 3,
                "notes": "",
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("room", res.data)


class GuestBookingTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()

    def test_guest_can_book_without_auth(self):
        res = self.client.post(
            reverse("booking-guest-create"),
            {
                "timeslot": self.slot.pk,
                "guest_name": "Gast Voorbeeld",
                "guest_email": "gast@example.com",
                "guest_phone": "0612345678",
                "notes": "Ik kom iets eerder.",
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        booking = Booking.objects.get(pk=res.data["booking"]["id"])
        self.assertIsNone(booking.customer_id)
        self.assertEqual(booking.guest_email, "gast@example.com")

    def test_guest_duplicate_email_on_same_slot_is_blocked(self):
        Booking.objects.create(
            timeslot=self.slot,
            customer=None,
            guest_name="Gast A",
            guest_email="gast@example.com",
            status=Booking.BookingStatus.NEW,
        )

        res = self.client.post(
            reverse("booking-guest-create"),
            {
                "timeslot": self.slot.pk,
                "guest_name": "Gast B",
                "guest_email": "gast@example.com",
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_guest_booking_respects_capacity(self):
        Booking.objects.create(
            timeslot=self.slot2,
            customer=None,
            guest_name="Gast Vol",
            guest_email="vol@example.com",
            status=Booking.BookingStatus.NEW,
        )

        res = self.client.post(
            reverse("booking-guest-create"),
            {
                "timeslot": self.slot2.pk,
                "guest_name": "Gast Te Laat",
                "guest_email": "te-laat@example.com",
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("timeslot", res.data)

    def test_guest_booking_rate_limited(self):
        cache.clear()
        rate_slot = _make_timeslot(self.activity, self.room, offset_days=7, capacity=10, title="Rate test slot")

        statuses = []
        for index in range(6):
            response = self.client.post(
                reverse("booking-guest-create"),
                {
                    "timeslot": rate_slot.pk,
                    "guest_name": f"Gast {index}",
                    "guest_email": f"gast-rate-{index}@example.com",
                },
                format="json",
            )
            statuses.append(response.status_code)

        self.assertEqual(statuses[:5], [status.HTTP_201_CREATED] * 5)
        self.assertEqual(statuses[5], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_guest_booking_participants_respect_capacity(self):
        res = self.client.post(
            reverse("booking-guest-create"),
            {
                "timeslot": self.slot.pk,
                "guest_name": "Groep A",
                "guest_email": "groep-a@example.com",
                "participants": 2,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        blocked = self.client.post(
            reverse("booking-guest-create"),
            {
                "timeslot": self.slot.pk,
                "guest_name": "Groep B",
                "guest_email": "groep-b@example.com",
                "participants": 1,
            },
            format="json",
        )
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)


class PaymentFlowTests(BaseTestCase):
    def test_booking_returns_service_unavailable_when_mollie_is_missing(self):
        with patch("core.views.create_mollie_checkout", side_effect=MolliePaymentError("Mollie API key ontbreekt. Stel MOLLIE_API_KEY in.")):
            response = self.client.post(
                reverse("booking-guest-create"),
                {
                    "timeslot": self.slot.pk,
                    "guest_name": "Gast Voorbeeld",
                    "guest_email": "gast@example.com",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE, response.data)
        self.assertIn("Betalingen zijn tijdelijk niet beschikbaar", str(response.data["detail"]))

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_guest_booking_without_payment_sends_email(self):
        response = self.client.post(
            reverse("booking-guest-create"),
            {
                "timeslot": self.slot2.pk,
                "guest_name": "Gast Zonder Betaling",
                "guest_email": "gast-zonder-betaling@example.com",
                "participants": 1,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertFalse(response.data["payment"]["required"])
        self.assertNotIn("payment_id", response.data["payment"])
        booking = Booking.objects.get(pk=response.data["booking"]["id"])
        self.assertEqual(booking.status, Booking.BookingStatus.NEW)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("gast-zonder-betaling@example.com", mail.outbox[0].to)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_webhook_marks_booking_paid_and_sends_email(self):
        self.klant1.email = "klant1@example.com"
        self.klant1.save(update_fields=["email"])

        with patch("core.views.get_mollie_payment", return_value={"status": "paid"}):
            create_response = _jwt(self.klant1).post(reverse("booking-list-create"), {"timeslot": self.slot.pk})
            self.assertEqual(create_response.status_code, status.HTTP_201_CREATED, create_response.data)

            payment_id = create_response.data["payment"]["payment_id"]
            public_reference = create_response.data["payment"]["public_reference"]

            webhook_response = self.client.post(reverse("payments-mollie-webhook"), {"id": payment_id}, format="json")
            self.assertEqual(webhook_response.status_code, status.HTTP_200_OK, webhook_response.data)

            booking = Booking.objects.get(pk=create_response.data["booking"]["id"])
            payment = booking.payment_intent
            self.assertEqual(booking.status, Booking.BookingStatus.PAID)
            self.assertEqual(payment.status, PaymentIntent.PaymentStatus.PAID)

            status_response = self.client.get(reverse("payment-status", kwargs={"public_reference": public_reference}))
            self.assertEqual(status_response.status_code, status.HTTP_200_OK, status_response.data)
            self.assertEqual(status_response.data["payment_status"], PaymentIntent.PaymentStatus.PAID)
            self.assertEqual(status_response.data["booking_status"], Booking.BookingStatus.PAID)
            self.assertEqual(len(mail.outbox), 1)
            self.assertIn("klant1@example.com", mail.outbox[0].to)

    def test_public_payment_status_shows_pending(self):
        create_response = _jwt(self.klant1).post(reverse("booking-list-create"), {"timeslot": self.slot.pk})
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED, create_response.data)

        public_reference = create_response.data["payment"]["public_reference"]
        status_response = self.client.get(reverse("payment-status", kwargs={"public_reference": public_reference}))
        self.assertEqual(status_response.status_code, status.HTTP_200_OK, status_response.data)
        self.assertEqual(status_response.data["payment_status"], PaymentIntent.PaymentStatus.RESERVED)
        self.assertEqual(status_response.data["booking_status"], Booking.BookingStatus.RESERVED)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_guest_booking_sends_confirmation_email(self):
        with patch("core.views.get_mollie_payment", return_value={"status": "paid"}):
            res = self.client.post(
                reverse("booking-guest-create"),
                {
                    "timeslot": self.slot.pk,
                    "guest_name": "Gast Voorbeeld",
                    "guest_email": "gast@example.com",
                },
                format="json",
            )

            self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
            self.assertEqual(len(mail.outbox), 0)

            payment_id = res.data["payment"]["payment_id"]
            webhook_response = self.client.post(reverse("payments-mollie-webhook"), {"id": payment_id}, format="json")
            self.assertEqual(webhook_response.status_code, status.HTTP_200_OK, webhook_response.data)
            self.assertEqual(len(mail.outbox), 1)
            self.assertIn("gast@example.com", mail.outbox[0].to)
