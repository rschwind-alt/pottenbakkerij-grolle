import os

DJANGO_ENV = os.getenv("DJANGO_ENV", "local").lower()

if DJANGO_ENV == "production":
    from .production import *  # noqa: F403,F401
else:
    from .local import *  # noqa: F403,F401
