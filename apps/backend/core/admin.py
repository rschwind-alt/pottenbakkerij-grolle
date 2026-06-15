from django.contrib import admin

from .models import Activity, Booking, PaymentIntent, Product, ProductGroup, Profile, Room, Timeslot, WebshopOrder, WebshopOrderItem


@admin.register(ProductGroup)
class ProductGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    fields = ("name", "slug", "description", "image_url", "is_active")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "group", "price", "stock_quantity", "is_active", "updated_at")
    list_filter = ("group", "is_active")
    search_fields = ("name", "slug")
    fields = ("group", "name", "slug", "description", "long_description", "image_url", "price", "stock_quantity", "is_active")


class WebshopOrderItemInline(admin.TabularInline):
    model = WebshopOrderItem
    extra = 0
    readonly_fields = ("product", "product_name", "unit_price", "quantity")
    can_delete = False


@admin.register(WebshopOrder)
class WebshopOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "guest_name", "guest_email", "status", "total_amount", "created_at")
    list_filter = ("status",)
    search_fields = ("guest_name", "guest_email", "customer__username")
    inlines = [WebshopOrderItemInline]


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email")


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "requires_payment", "default_room", "default_duration_minutes", "is_active", "updated_at")
    list_filter = ("is_active", "requires_payment")
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
    list_display = ("public_reference", "provider_reference", "booking", "amount", "currency", "status", "updated_at")
    list_filter = ("status", "currency", "provider")
    search_fields = ("provider_reference", "booking__customer__username")
