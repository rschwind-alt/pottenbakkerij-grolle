from django.db import migrations


def normalize_webshop_image_urls(apps, schema_editor):
    Product = apps.get_model("core", "Product")
    ProductGroup = apps.get_model("core", "ProductGroup")

    # Legacy seed paths pointed to frontend public assets; webshop data should come from backend media.
    for product in Product.objects.filter(image_url__startswith="/webshop/"):
        product.image_url = f"/media{product.image_url}"
        product.save(update_fields=["image_url"])

    for group in ProductGroup.objects.filter(image_url__startswith="/webshop/"):
        group.image_url = f"/media{group.image_url}"
        group.save(update_fields=["image_url"])

    # Normalize old upload subfolder variant.
    for product in Product.objects.filter(image_url__startswith="/media/webshop/uploads/"):
        product.image_url = product.image_url.replace("/media/webshop/uploads/", "/media/webshop/")
        product.save(update_fields=["image_url"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0012_product_stock_quantity"),
    ]

    operations = [
        migrations.RunPython(normalize_webshop_image_urls, migrations.RunPython.noop),
    ]
