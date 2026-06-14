import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone


logger = logging.getLogger(__name__)


def _contact_name_for_booking(booking):
    if booking.guest_name:
        return booking.guest_name

    if booking.customer:
        full_name = booking.customer.get_full_name().strip()
        if full_name:
            return full_name
        if booking.customer.username:
            return booking.customer.username

    return "Klant"


def _recipient_for_booking(booking):
    if booking.guest_email:
        return booking.guest_email
    if booking.customer and booking.customer.email:
        return booking.customer.email
    return ""


def send_booking_confirmation_email(booking, language="nl"):
    if not getattr(settings, "BOOKING_CONFIRMATION_EMAIL_ENABLED", True):
        return

    recipient = _recipient_for_booking(booking)
    if not recipient:
        logger.info("Skip booking confirmation email: no recipient", extra={"booking_id": booking.id})
        return
    bcc_recipients = getattr(settings, "BOOKING_CONFIRMATION_BCC", [])

    starts_local = timezone.localtime(booking.timeslot.starts_at)
    ends_local = timezone.localtime(booking.timeslot.ends_at)
    start_label = starts_local.strftime("%d-%m-%Y %H:%M")
    end_label = ends_local.strftime("%H:%M")
    activity_name = booking.timeslot.activity.name
    slot_title = booking.timeslot.title
    room_name = booking.timeslot.room.name
    contact_name = _contact_name_for_booking(booking)
    is_german = str(language or "").lower().startswith("de")

    if is_german:
        subject = f"Buchungsbestaetigung #{booking.id} - {activity_name}"
        body = (
            f"Hallo {contact_name},\n\n"
            "deine Buchung wurde erfolgreich empfangen.\n\n"
            f"Buchungsnummer: {booking.id}\n"
            f"Aktivitaet: {activity_name}\n"
            f"Zeitfenster: {slot_title}\n"
            f"Datum/Uhrzeit: {start_label} bis {end_label}\n"
            f"Raum: {room_name}\n"
            f"Teilnehmer: {booking.participants}\n"
            f"Status: {booking.status}\n\n"
            "Vielen Dank und bis bald bei Pottenbakkerij Grolle."
        )
    else:
        subject = f"Boekingsbevestiging #{booking.id} - {activity_name}"
        body = (
            f"Beste {contact_name},\n\n"
            "je boeking is succesvol ontvangen.\n\n"
            f"Boekingsnummer: {booking.id}\n"
            f"Activiteit: {activity_name}\n"
            f"Tijdslot: {slot_title}\n"
            f"Datum/tijd: {start_label} tot {end_label}\n"
            f"Ruimte: {room_name}\n"
            f"Deelnemers: {booking.participants}\n"
            f"Status: {booking.status}\n\n"
            "Bedankt en graag tot ziens bij Pottenbakkerij Grolle."
        )

    try:
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
            bcc=bcc_recipients,
        )
        email.send(fail_silently=False)
    except Exception:
        logger.exception("Failed to send booking confirmation email", extra={"booking_id": booking.id})
