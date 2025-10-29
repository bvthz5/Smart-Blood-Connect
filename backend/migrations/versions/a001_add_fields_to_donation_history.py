"""add fields to donation history

Revision ID: a001_add_fields_to_donation_history
Revises: create_ml_tables_001
Create Date: 2025-10-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a001_add_fields_to_donation_history'
down_revision = 'create_ml_tables_001'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to donation_history table
    op.add_column('donation_history', sa.Column('status', sa.String(50), server_default='completed'))
    op.add_column('donation_history', sa.Column('location', sa.String(255)))
    op.add_column('donation_history', sa.Column('notes', sa.Text))
    op.add_column('donation_history', sa.Column('created_at', sa.DateTime, server_default=sa.text('CURRENT_TIMESTAMP')))
    op.add_column('donation_history', sa.Column('updated_at', sa.DateTime, server_default=sa.text('CURRENT_TIMESTAMP')))

def downgrade():
    # Remove the columns if needed to rollback
    op.drop_column('donation_history', 'status')
    op.drop_column('donation_history', 'location')
    op.drop_column('donation_history', 'notes')
    op.drop_column('donation_history', 'created_at')
    op.drop_column('donation_history', 'updated_at')