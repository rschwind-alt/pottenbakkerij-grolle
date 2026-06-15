from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from core.models import Product, ProductGroup


SEED_GROUPS = [
    {
        "name": "Servies",
        "description": "Dagelijks servies en tafelwerk in keramiek.",
        "image_url": "/media/webshop/clay-mokken.png",
    },
    {
        "name": "Kunst",
        "description": "Artistieke stukken met een unieke uitstraling.",
        "image_url": "/media/webshop/clay-bordjes.png",
    },
    {
        "name": "Decoratie",
        "description": "Objecten en vazen voor sfeer in huis.",
        "image_url": "/media/webshop/clay-vaasjes.png",
    },
]


SEED_PRODUCTS = [
    {
        "name": "Ambachtelijke Koffiemok",
        "group": "Servies",
        "description": "Steengoed mok met matte glazuurafwerking.",
        "long_description": "Handgedraaide koffiemok in steengoed. Elke mok heeft een unieke glazuurtekening en ligt prettig in de hand. Geschikt voor dagelijks gebruik.",
        "image_url": "/media/webshop/clay-mokken.png",
        "price": Decimal("24.50"),
        "stock_quantity": 18,
    },
    {
        "name": "Espresso Set Terra",
        "group": "Servies",
        "description": "Set van twee handgedraaide espressokopjes.",
        "long_description": "Set van twee compacte espressokopjes met een warme terra uitstraling. Ideaal als cadeau of voor een stijlvolle koffiepauze.",
        "image_url": "/media/webshop/clay-kommetjes.png",
        "price": Decimal("32.00"),
        "stock_quantity": 12,
    },
    {
        "name": "Serveerbord Rivierklei",
        "group": "Kunst",
        "description": "Organisch gevormd serveerbord voor brood of tapas.",
        "long_description": "Breed serveerbord met natuurlijke randafwerking. Perfect voor tapas, brood of kleine gerechten op tafel met een ambachtelijke uitstraling.",
        "image_url": "/media/webshop/clay-bordjes.png",
        "price": Decimal("39.95"),
        "stock_quantity": 7,
    },
    {
        "name": "Vaas Hoge Hals",
        "group": "Decoratie",
        "description": "Slanke vaas met subtiele zandstructuur.",
        "long_description": "Elegante vaas met hoge hals en subtiele structuur. Mooi als los object of met een klein boeket droogbloemen.",
        "image_url": "/media/webshop/clay-vaasjes.png",
        "price": Decimal("54.00"),
        "stock_quantity": 5,
    },
]


class Command(BaseCommand):
    help = "Seed demo products for local development"

    def handle(self, *args, **options):
        created = 0
        updated = 0

        groups_by_name = {}
        for group in SEED_GROUPS:
            group_slug = slugify(group["name"])
            obj, _ = ProductGroup.objects.update_or_create(
                slug=group_slug,
                defaults={
                    "name": group["name"],
                    "description": group["description"],
                    "image_url": group["image_url"],
                    "is_active": True,
                },
            )
            groups_by_name[group["name"]] = obj

        for item in SEED_PRODUCTS:
            slug = slugify(item["name"])
            _, is_created = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "group": groups_by_name.get(item.get("group")),
                    "name": item["name"],
                    "description": item["description"],
                    "long_description": item["long_description"],
                    "image_url": item["image_url"],
                    "price": item["price"],
                    "stock_quantity": item["stock_quantity"],
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
