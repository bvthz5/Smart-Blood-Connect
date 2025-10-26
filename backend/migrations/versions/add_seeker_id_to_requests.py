"""Add seeker_id to blood_requests table

Revision ID: add_seeker_id_to_requests
Revises: add_hospital_staff_unique
Create Date: 2025-10-25

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_seeker_id_to_requests'
down_revision = 'add_hospital_staff_unique'
branch_labels = None
depends_on = None


def upgrade():
    """Add seeker_id column to blood_requests table"""
    with op.batch_alter_table('blood_requests', schema=None) as batch_op:
        try:
            # Add seeker_id column as nullable first
            batch_op.add_column(sa.Column('seeker_id', sa.Integer(), nullable=True))
        except Exception:
            # Column might already exist
            pass

        try:
            # Create foreign key constraint
            batch_op.create_foreign_key(
                'fk_blood_requests_seeker_id',
                'users',
                ['seeker_id'],
                ['id']
            )
        except Exception:
            # Constraint might already exist
            pass

        try:
            # Create index for better query performance
            batch_op.create_index('idx_blood_requests_seeker_id', ['seeker_id'])
        except Exception:
            # Index might already exist
            pass


def downgrade():
    """Remove seeker_id column from blood_requests table"""
    with op.batch_alter_table('blood_requests', schema=None) as batch_op:
        # Drop index
        batch_op.drop_index('idx_blood_requests_seeker_id')
        
        # Drop foreign key
        batch_op.drop_constraint('fk_blood_requests_seeker_id', type_='foreignkey')
        
        # Drop column
        batch_op.drop_column('seeker_id')

