"""Remove contact_number from hospitals table

Revision ID: remove_contact_number
Revises: 
Create Date: 2025-01-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_contact_number'
down_revision = None  # Update this if you know the previous migration ID
branch_labels = None
depends_on = None


def upgrade():
    """Remove contact_number column from hospitals table"""
    with op.batch_alter_table('hospitals', schema=None) as batch_op:
        batch_op.drop_column('contact_number')


def downgrade():
    """Add back contact_number column to hospitals table"""
    with op.batch_alter_table('hospitals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('contact_number', sa.String(length=20), nullable=True))
