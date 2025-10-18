"""
ML Module for SmartBlood Connect
Handles model loading, feature engineering, and predictions
"""

from .model_client import ModelClient
from .feature_builder import FeatureBuilder

__all__ = ['ModelClient', 'FeatureBuilder']
