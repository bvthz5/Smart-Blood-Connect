#!/usr/bin/env python3
"""
Celery Worker Entry Point
Run with: python celery_worker.py
Or: celery -A celery_worker.celery_app worker --loglevel=info
"""

import os
from dotenv import load_dotenv
from app import create_app
from app.tasks.celery_app import celery_app

# Load environment variables
load_dotenv()

# Create Flask app for context
flask_app = create_app()

# Configure Celery with Flask app context
class ContextTask(celery_app.Task):
    """Make celery tasks work with Flask app context"""
    def __call__(self, *args, **kwargs):
        with flask_app.app_context():
            return self.run(*args, **kwargs)

celery_app.Task = ContextTask

if __name__ == '__main__':
    # Start worker
    celery_app.start()
