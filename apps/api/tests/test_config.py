import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_requires_long_session_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", session_secret="too-short")