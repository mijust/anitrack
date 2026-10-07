from typing import AsyncGenerator

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import session_factory
from app.models.user import User


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as session:
        yield session


async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    """Gibt im lokalen Single-User-Modus den Standard-Benutzer zurück (kein Login/Account erforderlich)."""
    user = await db.scalar(select(User).order_by(User.id.asc()))
    if not user:
        user = User(username="default", password_hash="disabled")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user
