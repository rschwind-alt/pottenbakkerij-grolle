import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_planning_datamodel"),
    ]

    operations = [
        migrations.AddField(
            model_name="activity",
            name="default_room",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="default_for_activities",
                to="core.room",
            ),
        ),
    ]
