from django.contrib import admin

from .models import Activity, Booking, PaymentIntent, Product, Profile, Room, Timeslot


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email")


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("name", "default_room", "default_duration_minutes", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    autocomplete_fields = ("default_room",)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "capacity", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")


@admin.register(Timeslot)
class TimeslotAdmin(admin.ModelAdmin):
    list_display = ("id", "activity", "room", "starts_at", "ends_at", "capacity", "created_by")
    list_filter = ("activity", "room")
    search_fields = ("activity__name", "room__name")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "timeslot", "customer", "status", "created_at", "updated_at")
    list_filter = ("status",)
    search_fields = ("customer__username", "timeslot__activity__name", "timeslot__room__name")


@admin.register(PaymentIntent)
class PaymentIntentAdmin(admin.ModelAdmin):
    list_display = ("provider_reference", "booking", "amount", "currency", "status", "updated_at")
    list_filter = ("status", "currency", "provider")
    search_fields = ("provider_reference", "booking__customer__username")
