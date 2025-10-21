"""Add state and pincode, remove location from hospitals table

Revision ID: add_state_pincode
Revises: remove_blood_type
Create Date: 2025-01-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_state_pincode'
down_revision = 'remove_blood_type'
branch_labels = None
depends_on = None


def upgrade():
    """Add state and pincode columns, remove location column from hospitals table"""
    with op.batch_alter_table('hospitals', schema=None) as batch_op:
        # Add new columns
        batch_op.add_column(sa.Column('state', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('pincode', sa.String(length=10), nullable=True))
        # Remove old column
        batch_op.drop_column('location')


def downgrade():
    """Remove state and pincode columns, add back location column"""
    with op.batch_alter_table('hospitals', schema=None) as batch_op:
        # Add back old column
        batch_op.add_column(sa.Column('location', sa.String(length=255), nullable=True))
        # Remove new columns
        batch_op.drop_column('pincode')
        batch_op.drop_column('state')
