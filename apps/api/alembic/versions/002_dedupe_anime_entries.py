"""dedupe anime entries and enforce per-user uniqueness

Revision ID: 002_dedupe_anime_entries
Revises: 001_initial
Create Date: 2026-10-07
"""

from alembic import op
import sqlalchemy as sa

revision = "002_dedupe_anime_entries"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("""
        DELETE FROM anime_entries
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM anime_entries
            GROUP BY user_id, anilist_id
        )
    """))
    op.create_index("uq_anime_entries_user_anilist", "anime_entries", ["user_id", "anilist_id"], unique=True)


def downgrade() -> None:
    op.drop_index("uq_anime_entries_user_anilist", table_name="anime_entries")