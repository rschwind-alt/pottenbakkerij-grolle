from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_product_groups"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="stock_quantity",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
