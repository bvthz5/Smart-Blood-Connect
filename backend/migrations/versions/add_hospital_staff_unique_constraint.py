"""Add unique constraint to hospital_staff.hospital_id

Revision ID: add_hospital_staff_unique
Revises: add_state_pincode
Create Date: 2025-01-20 09:19:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_hospital_staff_unique'
down_revision = 'add_state_pincode'
branch_labels = None
depends_on = None


def upgrade():
    # Add unique constraint to hospital_id if it doesn't exist
    try:
        op.create_unique_constraint('uq_hospital_staff_hospital_id', 'hospital_staff', ['hospital_id'])
    except Exception as e:
        print(f"Constraint might already exist: {e}")


def downgrade():
    # Remove unique constraint
    try:
        op.drop_constraint('uq_hospital_staff_hospital_id', 'hospital_staff', type_='unique')
    except Exception as e:
        print(f"Error dropping constraint: {e}")
