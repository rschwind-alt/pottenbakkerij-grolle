from rest_framework.permissions import BasePermission

from .i18n import tr
from .models import Profile, RoleChoices


def get_user_role(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return RoleChoices.ADMIN
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile.role


class IsAdminOrMedewerker(BasePermission):
    message = tr(
        "Je hebt geen beheerrechten voor planningdata.",
        "Du hast keine Verwaltungsrechte fuer die Planungsdaten.",
    )

    def has_permission(self, request, view):
        self.message = tr(
            "Je hebt geen beheerrechten voor planningdata.",
            "Du hast keine Verwaltungsrechte fuer die Planungsdaten.",
        )
        return get_user_role(request.user) in {RoleChoices.ADMIN, RoleChoices.MEDEWERKER}


class IsBookingOwnerOrStaff(BasePermission):
    message = tr(
        "Je mag alleen je eigen boekingen bekijken.",
        "Du darfst nur deine eigenen Buchungen ansehen.",
    )

    def has_object_permission(self, request, view, obj):
        self.message = tr(
            "Je mag alleen je eigen boekingen bekijken.",
            "Du darfst nur deine eigenen Buchungen ansehen.",
        )
        role = get_user_role(request.user)
        if role in {RoleChoices.ADMIN, RoleChoices.MEDEWERKER}:
            return True
        return obj.customer_id == request.user.id
