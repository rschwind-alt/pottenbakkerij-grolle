from django.db import migrations, models
import django.db.models.deletion


def seed_product_groups(apps, schema_editor):
    Product = apps.get_model("core", "Product")
    ProductGroup = apps.get_model("core", "ProductGroup")

    groups = {
        "servies": ProductGroup.objects.update_or_create(
            slug="servies",
            defaults={
                "name": "Servies",
                "description": "Dagelijks servies en tafelwerk in keramiek.",
                "image_url": "/webshop/clay-mokken.png",
                "is_active": True,
            },
        )[0],
        "kunst": ProductGroup.objects.update_or_create(
            slug="kunst",
            defaults={
                "name": "Kunst",
                "description": "Artistieke stukken met een unieke uitstraling.",
                "image_url": "/webshop/clay-bordjes.png",
                "is_active": True,
            },
        )[0],
        "decoratie": ProductGroup.objects.update_or_create(
            slug="decoratie",
            defaults={
                "name": "Decoratie",
                "description": "Objecten en vazen voor sfeer in huis.",
                "image_url": "/webshop/clay-vaasjes.png",
                "is_active": True,
            },
        )[0],
    }

    Product.objects.filter(slug__in=["ambachtelijke-koffiemok", "espresso-set-terra"]).update(group=groups["servies"])
    Product.objects.filter(slug="serveerbord-rivierklei").update(group=groups["kunst"])
    Product.objects.filter(slug="vaas-hoge-hals").update(group=groups["decoratie"])


def unseed_product_groups(apps, schema_editor):
    ProductGroup = apps.get_model("core", "ProductGroup")
    ProductGroup.objects.filter(slug__in=["servies", "kunst", "decoratie"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_update_webshop_product_image_paths"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductGroup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("slug", models.SlugField(max_length=140, unique=True)),
                ("description", models.TextField(blank=True)),
                ("image_url", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="product",
            name="group",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="products", to="core.productgroup"),
        ),
        migrations.RunPython(seed_product_groups, reverse_code=unseed_product_groups),
    ]
