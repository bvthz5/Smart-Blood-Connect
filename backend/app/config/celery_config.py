"""
Celery Configuration for Background Tasks
"""

import os
from datetime import timedelta

class CeleryConfig:
    """Celery configuration settings"""
    
    # Broker settings
    broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    result_backend = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    
    # Task settings
    task_serializer = 'json'
    result_serializer = 'json'
    accept_content = ['json']
    timezone = 'Asia/Kolkata'
    enable_utc = True
    
    # Task execution settings
    task_track_started = True
    task_time_limit = 30 * 60  # 30 minutes
    task_soft_time_limit = 25 * 60  # 25 minutes
    
    # Result backend settings
    result_expires = 3600  # 1 hour
    
    # Worker settings
    worker_prefetch_multiplier = 4
    worker_max_tasks_per_child = 1000
    
    # Beat schedule for periodic tasks
    beat_schedule = {
        'update-donor-reliability-nightly': {
            'task': 'app.tasks.ml_tasks.update_donor_reliability_scores',
            'schedule': timedelta(days=1),  # Run daily at midnight
            'options': {'queue': 'ml_queue'}
        },
        'forecast-demand-weekly': {
            'task': 'app.tasks.ml_tasks.generate_demand_forecasts',
            'schedule': timedelta(weeks=1),  # Run weekly
            'options': {'queue': 'ml_queue'}
        },
        'cleanup-old-predictions': {
            'task': 'app.tasks.ml_tasks.cleanup_old_predictions',
            'schedule': timedelta(days=7),  # Run weekly
            'options': {'queue': 'default'}
        }
    }
    
    # Task routes
    task_routes = {
        'app.tasks.ml_tasks.*': {'queue': 'ml_queue'},
        'app.tasks.email_tasks.*': {'queue': 'email_queue'},
    }
