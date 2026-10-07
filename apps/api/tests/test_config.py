from app.core.config import Settings


def test_settings_load_defaults() -> None:
    settings = Settings()
    assert settings.app_name == "Anime Tracker API"
    assert settings.anilist_api_url == "https://graphql.anilist.co"