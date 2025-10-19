"""add soft delete fields to users

Revision ID: b3f8c9d12345
Revises: a4e507688538
Create Date: 2025-10-19 21:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3f8c9d12345'
down_revision = 'a4e507688538'
branch_labels = None
depends_on = None


def upgrade():
    # Add deleted_at column to users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('deleted_by', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_users_deleted_by', 'users', ['deleted_by'], ['id'])


def downgrade():
    # Remove soft delete columns from users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_deleted_by', type_='foreignkey')
        batch_op.drop_column('deleted_by')
        batch_op.drop_column('deleted_at')
