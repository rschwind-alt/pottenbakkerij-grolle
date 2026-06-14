import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0004_activity_default_room"),
    ]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="customer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bookings",
                to="auth.user",
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="guest_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="booking",
            name="guest_email",
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name="booking",
            name="guest_phone",
            field=models.CharField(blank=True, max_length=40),
        ),
    ]
