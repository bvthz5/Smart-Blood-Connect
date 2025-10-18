"""
ML Background Tasks
Scheduled tasks for model retraining, reliability updates, and forecasting
"""

from celery import shared_task
from datetime import datetime, timedelta, date
from flask import current_app
import pandas as pd

from app import create_app
from app.models import (
    db, Donor, DonationHistory, MatchPrediction,
    DemandForecast, ModelPredictionLog
)
from app.ml.model_client import model_client
from app.ml.feature_builder import FeatureBuilder


@shared_task(name='app.tasks.ml_tasks.update_donor_reliability_scores')
def update_donor_reliability_scores():
    """
    Nightly task to update donor reliability scores
    Uses the donor_reliability_model to compute scores
    """
    app = create_app()
    
    with app.app_context():
        try:
            current_app.logger.info("[TASK] Starting donor reliability score update")
            
            donors = Donor.query.all()
            updated_count = 0
            
            for donor in donors:
                try:
                    # Get donation history
                    donation_history = DonationHistory.query.filter_by(
                        donor_id=donor.id
                    ).all()
                    
                    # Build features
                    features = FeatureBuilder.build_reliability_features(
                        donor, donation_history
                    )
                    features_df = FeatureBuilder.features_to_dataframe(features)
                    
                    # Predict reliability score
                    prediction, _ = model_client.predict('donor_reliability', features_df)
                    new_score = float(prediction[0])
                    
                    # Update donor
                    donor.reliability_score = round(new_score, 3)
                    updated_count += 1
                    
                except Exception as e:
                    current_app.logger.error(
                        f"Failed to update reliability for donor {donor.id}: {str(e)}"
                    )
                    continue
            
            db.session.commit()
            
            current_app.logger.info(
                f"[TASK] Updated reliability scores for {updated_count}/{len(donors)} donors"
            )
            
            return {
                'status': 'success',
                'updated': updated_count,
                'total': len(donors)
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"[TASK] Reliability update failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}


@shared_task(name='app.tasks.ml_tasks.generate_demand_forecasts')
def generate_demand_forecasts(days_ahead=30):
    """
    Weekly task to generate blood demand forecasts
    Uses the kerala_demand_forecast_stacked_optuna model
    
    Args:
        days_ahead: Number of days to forecast (default: 30)
    """
    app = create_app()
    
    with app.app_context():
        try:
            current_app.logger.info(f"[TASK] Generating demand forecasts for {days_ahead} days")
            
            # Kerala districts
            districts = [
                'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
                'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
                'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
            ]
            
            blood_groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
            
            forecasts_created = 0
            
            for district in districts:
                for blood_group in blood_groups:
                    try:
                        # Get historical data (simplified - would query actual data)
                        historical_data = pd.DataFrame({
                            'demand': [10, 12, 11, 13, 15, 14, 12]  # Placeholder
                        })
                        
                        # Generate forecasts for next N days
                        for day_offset in range(days_ahead):
                            forecast_date = date.today() + timedelta(days=day_offset)
                            
                            # Build features
                            features_df = FeatureBuilder.build_demand_forecast_features(
                                district, blood_group, forecast_date, historical_data
                            )
                            
                            # Predict
                            prediction, _ = model_client.predict('demand_forecast', features_df)
                            predicted_demand = float(prediction[0])
                            
                            # Calculate confidence intervals (simplified)
                            confidence_lower = predicted_demand * 0.8
                            confidence_upper = predicted_demand * 1.2
                            
                            # Check if forecast already exists
                            existing = DemandForecast.query.filter_by(
                                district=district,
                                blood_group=blood_group,
                                forecast_date=forecast_date
                            ).first()
                            
                            if existing:
                                # Update existing forecast
                                existing.predicted_demand = predicted_demand
                                existing.confidence_lower = confidence_lower
                                existing.confidence_upper = confidence_upper
                                existing.model_version = '1.0.0'
                            else:
                                # Create new forecast
                                forecast = DemandForecast(
                                    district=district,
                                    blood_group=blood_group,
                                    forecast_date=forecast_date,
                                    predicted_demand=predicted_demand,
                                    confidence_lower=confidence_lower,
                                    confidence_upper=confidence_upper,
                                    model_version='1.0.0'
                                )
                                db.session.add(forecast)
                            
                            forecasts_created += 1
                        
                    except Exception as e:
                        current_app.logger.error(
                            f"Failed to forecast for {district}/{blood_group}: {str(e)}"
                        )
                        continue
            
            db.session.commit()
            
            current_app.logger.info(
                f"[TASK] Generated {forecasts_created} demand forecasts"
            )
            
            return {
                'status': 'success',
                'forecasts_created': forecasts_created
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"[TASK] Demand forecast failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}


@shared_task(name='app.tasks.ml_tasks.cleanup_old_predictions')
def cleanup_old_predictions(days_to_keep=30):
    """
    Clean up old prediction records to save database space
    
    Args:
        days_to_keep: Number of days of predictions to retain (default: 30)
    """
    app = create_app()
    
    with app.app_context():
        try:
            current_app.logger.info(f"[TASK] Cleaning up predictions older than {days_to_keep} days")
            
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            # Delete old match predictions
            deleted_matches = MatchPrediction.query.filter(
                MatchPrediction.created_at < cutoff_date
            ).delete()
            
            # Delete old prediction logs
            deleted_logs = ModelPredictionLog.query.filter(
                ModelPredictionLog.created_at < cutoff_date
            ).delete()
            
            db.session.commit()
            
            current_app.logger.info(
                f"[TASK] Cleaned up {deleted_matches} match predictions "
                f"and {deleted_logs} prediction logs"
            )
            
            return {
                'status': 'success',
                'deleted_matches': deleted_matches,
                'deleted_logs': deleted_logs
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"[TASK] Cleanup failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}


@shared_task(name='app.tasks.ml_tasks.retrain_model')
def retrain_model(model_key: str):
    """
    Placeholder for model retraining task
    In production, this would fetch new data, retrain, and deploy
    
    Args:
        model_key: Model identifier to retrain
    """
    app = create_app()
    
    with app.app_context():
        current_app.logger.info(f"[TASK] Model retraining requested for: {model_key}")
        
        # This is a placeholder - actual implementation would:
        # 1. Fetch training data from database
        # 2. Preprocess and split data
        # 3. Train new model
        # 4. Evaluate performance
        # 5. Save new model artifact
        # 6. Update ModelArtifact table
        # 7. Hot-reload the model
        
        return {
            'status': 'not_implemented',
            'message': 'Model retraining not yet implemented'
        }
