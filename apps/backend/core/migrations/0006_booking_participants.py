from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_guest_booking_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="participants",
            field=models.PositiveIntegerField(default=1),
        ),
    ]
