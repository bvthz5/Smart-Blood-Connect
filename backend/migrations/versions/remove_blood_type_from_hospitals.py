"""Remove blood_type from hospitals table

Revision ID: remove_blood_type
Revises: b3f8c9d12345
Create Date: 2025-01-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_blood_type'
down_revision = 'b3f8c9d12345'
branch_labels = None
depends_on = None


def upgrade():
    """Remove blood_type column from hospitals table"""
    with op.batch_alter_table('hospitals', schema=None) as batch_op:
        batch_op.drop_column('blood_type')


def downgrade():
    """Add back blood_type column to hospitals table"""
    with op.batch_alter_table('hospitals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('blood_type', sa.String(length=5), nullable=True))
