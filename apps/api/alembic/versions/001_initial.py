"""create users and anime entries

Revision ID: 001_initial
Revises:
Create Date: 2026-10-07
"""

from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=False)
    op.create_table(
        "anime_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("anilist_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("cover_image", sa.String(length=500), nullable=True),
        sa.Column("user_rating", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("episodes_watched", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_anime_entries_user_id"), "anime_entries", ["user_id"], unique=False)
    op.create_index(op.f("ix_anime_entries_anilist_id"), "anime_entries", ["anilist_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_anime_entries_anilist_id"), table_name="anime_entries")
    op.drop_index(op.f("ix_anime_entries_user_id"), table_name="anime_entries")
    op.drop_table("anime_entries")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")
