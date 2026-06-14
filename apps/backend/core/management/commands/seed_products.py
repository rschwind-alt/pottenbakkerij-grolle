from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from core.models import Product


SEED_PRODUCTS = [
    {
        "name": "Ambachtelijke Koffiemok",
        "description": "Steengoed mok met matte glazuurafwerking.",
        "price": Decimal("24.50"),
    },
    {
        "name": "Espresso Set Terra",
        "description": "Set van twee handgedraaide espressokopjes.",
        "price": Decimal("32.00"),
    },
    {
        "name": "Serveerbord Rivierklei",
        "description": "Organisch gevormd serveerbord voor brood of tapas.",
        "price": Decimal("39.95"),
    },
    {
        "name": "Vaas Hoge Hals",
        "description": "Slanke vaas met subtiele zandstructuur.",
        "price": Decimal("54.00"),
    },
]


class Command(BaseCommand):
    help = "Seed demo products for local development"

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for item in SEED_PRODUCTS:
            slug = slugify(item["name"])
            _, is_created = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": item["name"],
                    "description": item["description"],
                    "price": item["price"],
                    "is_active": True,
                },
            )
            if is_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete. created={created} updated={updated} total={Product.objects.count()}"
            )
        )
