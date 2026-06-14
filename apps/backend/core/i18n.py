from django.utils.translation import get_language


SUPPORTED_LANGUAGES = {"nl", "de"}
DEFAULT_LANGUAGE = "nl"


def current_language() -> str:
    language = (get_language() or DEFAULT_LANGUAGE).lower()
    base_language = language.split("-", 1)[0]
    if base_language in SUPPORTED_LANGUAGES:
        return base_language
    return DEFAULT_LANGUAGE


def tr(nl: str, de: str) -> str:
    return de if current_language() == "de" else nl