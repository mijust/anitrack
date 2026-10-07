from typing import AsyncGenerator, Optional

from fastapi import Cookie, Depends, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import session_factory
from app.models.user import User

SESSION_COOKIE = "anime_tracker_session"
settings = get_settings()
serializer = URLSafeTimedSerializer(settings.session_secret)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as session:
        yield session


def create_session_token(user_id: int) -> str:
    return serializer.dumps({"user_id": user_id})


def read_session_token(token: str) -> int:
    try:
        payload = serializer.loads(token, max_age=60 * 60 * 24 * 30)
        return int(payload["user_id"])
    except (BadSignature, KeyError, TypeError, ValueError, SignatureExpired) as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session") from error


async def get_current_user(
    session_cookie: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not session_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login required")

    user_id = read_session_token(session_cookie)
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
