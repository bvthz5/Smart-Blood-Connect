"""create ml tables

Revision ID: create_ml_tables_001
Revises: add_state_pincode_remove_location
Create Date: 2025-10-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'create_ml_tables_001'
down_revision = 'add_state_pincode_remove_location'
branch_labels = None
depends_on = None


def upgrade():
    # Create model_artifacts table
    op.create_table('model_artifacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('artifact_path', sa.String(length=500), nullable=False),
        sa.Column('metadata_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('deployed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('model_name')
    )
    
    # Create match_predictions table
    op.create_table('match_predictions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('request_id', sa.Integer(), nullable=False),
        sa.Column('donor_id', sa.Integer(), nullable=False),
        sa.Column('match_score', sa.Float(), nullable=True),
        sa.Column('availability_score', sa.Float(), nullable=True),
        sa.Column('response_time_hours', sa.Float(), nullable=True),
        sa.Column('reliability_score', sa.Float(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('feature_vector', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.Column('notified', sa.Boolean(), nullable=True),
        sa.Column('actual_response_time', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['donor_id'], ['donors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['request_id'], ['blood_requests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create demand_forecasts table
    op.create_table('demand_forecasts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('blood_group', sa.String(length=5), nullable=False),
        sa.Column('forecast_date', sa.Date(), nullable=False),
        sa.Column('predicted_demand', sa.Float(), nullable=False),
        sa.Column('confidence_lower', sa.Float(), nullable=True),
        sa.Column('confidence_upper', sa.Float(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('actual_demand', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('district', 'blood_group', 'forecast_date', name='unique_forecast')
    )
    
    # Create model_prediction_logs table
    op.create_table('model_prediction_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('endpoint', sa.String(length=200), nullable=True),
        sa.Column('input_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('prediction_output', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('inference_time_ms', sa.Float(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better query performance
    op.create_index('idx_match_predictions_request', 'match_predictions', ['request_id'], unique=False)
    op.create_index('idx_match_predictions_donor', 'match_predictions', ['donor_id'], unique=False)
    op.create_index('idx_demand_forecasts_district', 'demand_forecasts', ['district'], unique=False)
    op.create_index('idx_demand_forecasts_blood_group', 'demand_forecasts', ['blood_group'], unique=False)
    op.create_index('idx_demand_forecasts_date', 'demand_forecasts', ['forecast_date'], unique=False)
    op.create_index('idx_prediction_logs_model', 'model_prediction_logs', ['model_name'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index('idx_prediction_logs_model', table_name='model_prediction_logs')
    op.drop_index('idx_demand_forecasts_date', table_name='demand_forecasts')
    op.drop_index('idx_demand_forecasts_blood_group', table_name='demand_forecasts')
    op.drop_index('idx_demand_forecasts_district', table_name='demand_forecasts')
    op.drop_index('idx_match_predictions_donor', table_name='match_predictions')
    op.drop_index('idx_match_predictions_request', table_name='match_predictions')
    
    # Drop tables
    op.drop_table('model_prediction_logs')
    op.drop_table('demand_forecasts')
    op.drop_table('match_predictions')
    op.drop_table('model_artifacts')
