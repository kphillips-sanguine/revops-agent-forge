"""Add password_hash to users

Revision ID: 003_add_password_hash
Revises: 002_admin_systems
Create Date: 2026-03-17
"""
from alembic import op
import sqlalchemy as sa

revision = "003_add_password_hash"
down_revision = "002_admin_systems"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))
    # Set default password for existing admin user
    import bcrypt
    default_hash = bcrypt.hashpw(b"AgentForge2026!", bcrypt.gensalt()).decode("utf-8")
    op.execute(
        sa.text("UPDATE users SET password_hash = :h WHERE email = 'kevin@sanguinebio.com'").bindparams(h=default_hash)
    )


def downgrade() -> None:
    op.drop_column("users", "password_hash")
