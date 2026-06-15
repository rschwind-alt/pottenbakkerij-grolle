from decimal import Decimal

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0008_activity_requires_payment"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="image_url",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="product",
            name="long_description",
            field=models.TextField(blank=True),
        ),
        migrations.CreateModel(
            name="WebshopOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("guest_name", models.CharField(blank=True, max_length=120)),
                ("guest_email", models.EmailField(blank=True, max_length=254)),
                ("guest_phone", models.CharField(blank=True, max_length=40)),
                ("notes", models.TextField(blank=True)),
                ("total_amount", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10)),
                (
                    "status",
                    models.CharField(
                        choices=[("nieuw", "Nieuw"), ("ingediend", "Ingediend"), ("geannuleerd", "Geannuleerd")],
                        default="nieuw",
                        max_length=20,
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="webshop_orders",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="WebshopOrderItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("product_name", models.CharField(max_length=120)),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("quantity", models.PositiveIntegerField(default=1)),
                (
                    "order",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="core.webshoporder"),
                ),
                (
                    "product",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="order_items", to="core.product"),
                ),
            ],
            options={"ordering": ["id"]},
        ),
    ]
