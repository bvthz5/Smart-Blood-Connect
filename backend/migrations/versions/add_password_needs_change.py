"""add password_needs_change column

Revision ID: add_password_needs_change
Revises: remove_contact_number
Create Date: 2025-01-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_password_needs_change'
down_revision = 'remove_contact_number'
branch_labels = None
depends_on = None


def upgrade():
    # Add password_needs_change column to users table
    op.add_column('users', sa.Column('password_needs_change', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    # Remove password_needs_change column
    op.drop_column('users', 'password_needs_change')
