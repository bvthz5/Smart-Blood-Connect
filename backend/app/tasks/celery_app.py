"""
Celery Application Instance
"""

from celery import Celery
from app.config.celery_config import CeleryConfig

# Create Celery instance
celery_app = Celery('smartblood')
celery_app.config_from_object(CeleryConfig)

# Auto-discover tasks
celery_app.autodiscover_tasks(['app.tasks'])
