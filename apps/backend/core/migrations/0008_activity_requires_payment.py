from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0007_activity_price_paymentintent_public_reference"),
    ]

    operations = [
        migrations.AddField(
            model_name="activity",
            name="requires_payment",
            field=models.BooleanField(default=True),
        ),
    ]
