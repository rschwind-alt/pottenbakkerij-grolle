from decimal import Decimal

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.utils import timezone


def seed_default_activity_and_room(apps, schema_editor):
    Activity = apps.get_model("core", "Activity")
    Room = apps.get_model("core", "Room")
    Timeslot = apps.get_model("core", "Timeslot")

    activity, _ = Activity.objects.get_or_create(
        slug="algemeen",
        defaults={
            "name": "Algemene Activiteit",
            "description": "Fallback activiteit voor bestaande planningslots.",
            "default_duration_minutes": 90,
            "is_active": True,
        },
    )
    room, _ = Room.objects.get_or_create(
        slug="atelier-1",
        defaults={
            "name": "Atelier 1",
            "description": "Fallback ruimte voor bestaande planningslots.",
            "capacity": 1,
            "is_active": True,
        },
    )

    for timeslot in Timeslot.objects.all():
        if not timeslot.title:
            timeslot.title = f"{activity.name} {timeslot.starts_at:%Y-%m-%d %H:%M}"
        timeslot.activity = activity
        timeslot.room = room
        if not timeslot.capacity:
            timeslot.capacity = 1
        timeslot.save(update_fields=["title", "activity", "room", "capacity"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_planningslot_profile_booking"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameModel(
            old_name="PlanningSlot",
            new_name="Timeslot",
        ),
        migrations.RenameField(
            model_name="booking",
            old_name="slot",
            new_name="timeslot",
        ),
        migrations.RemoveConstraint(
            model_name="booking",
            name="unique_slot_customer_booking",
        ),
        migrations.CreateModel(
            name="Activity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("slug", models.SlugField(max_length=140, unique=True)),
                ("description", models.TextField(blank=True)),
                ("default_duration_minutes", models.PositiveIntegerField(default=90)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Room",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("slug", models.SlugField(max_length=140, unique=True)),
                ("description", models.TextField(blank=True)),
                ("capacity", models.PositiveIntegerField(default=1)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="timeslot",
            name="activity",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name="timeslots", to="core.activity"),
        ),
        migrations.AddField(
            model_name="timeslot",
            name="capacity",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="timeslot",
            name="room",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name="timeslots", to="core.room"),
        ),
        migrations.AddField(
            model_name="booking",
            name="status",
            field=models.CharField(choices=[("nieuw", "Nieuw"), ("gereserveerd", "Gereserveerd"), ("betaald", "Betaald"), ("geannuleerd", "Geannuleerd"), ("no_show", "No-show")], default="nieuw", max_length=20),
        ),
        migrations.AddField(
            model_name="booking",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=timezone.now),
            preserve_default=False,
        ),
        migrations.AddConstraint(
            model_name="booking",
            constraint=models.UniqueConstraint(fields=("timeslot", "customer"), name="unique_timeslot_customer_booking"),
        ),
        migrations.CreateModel(
            name="PaymentIntent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("provider", models.CharField(default="mock", max_length=40)),
                ("provider_reference", models.CharField(max_length=120, unique=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("currency", models.CharField(default="EUR", max_length=3)),
                ("status", models.CharField(choices=[("nieuw", "Nieuw"), ("gereserveerd", "Gereserveerd"), ("betaald", "Betaald"), ("geannuleerd", "Geannuleerd"), ("mislukt", "Mislukt")], default="nieuw", max_length=20)),
                ("booking", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="payment_intent", to="core.booking")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.RunPython(seed_default_activity_and_room, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="timeslot",
            name="activity",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="timeslots", to="core.activity"),
        ),
        migrations.AlterField(
            model_name="timeslot",
            name="room",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="timeslots", to="core.room"),
        ),
        migrations.AddConstraint(
            model_name="timeslot",
            constraint=models.UniqueConstraint(fields=("room", "starts_at", "ends_at"), name="unique_room_timespan"),
        ),
    ]
