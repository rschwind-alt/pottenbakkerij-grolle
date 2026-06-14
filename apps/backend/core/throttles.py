from rest_framework.throttling import AnonRateThrottle


class GuestBookingThrottle(AnonRateThrottle):
    scope = "guest_booking"