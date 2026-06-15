from django.db import migrations


def move_product_image_paths_to_webshop_dir(apps, schema_editor):
    Product = apps.get_model("core", "Product")

    replacements = {
        "/clay-mokken.png": "/webshop/clay-mokken.png",
        "/clay-kommetjes.png": "/webshop/clay-kommetjes.png",
        "/clay-bordjes.png": "/webshop/clay-bordjes.png",
        "/clay-vaasjes.png": "/webshop/clay-vaasjes.png",
    }

    for old_path, new_path in replacements.items():
        Product.objects.filter(image_url=old_path).update(image_url=new_path)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0009_webshop_order_and_product_details"),
    ]

    operations = [
        migrations.RunPython(move_product_image_paths_to_webshop_dir, reverse_code=noop_reverse),
    ]
