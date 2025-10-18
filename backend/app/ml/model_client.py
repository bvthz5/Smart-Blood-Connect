"""
ModelClient - Thread-safe ML model loader and predictor
Handles loading, caching, and hot-reloading of ML models
"""

import os
import json
import joblib
import threading
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from flask import current_app


class ModelClient:
    """Thread-safe ML model loader with caching and hot-reload support"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Singleton pattern for thread-safe model loading"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize model client"""
        if not hasattr(self, 'initialized'):
            self.models: Dict[str, Any] = {}
            self.model_metadata: Dict[str, Dict] = {}
            self.model_map_path = None
            self.artifacts_dir = None
            self.initialized = False
    
    def initialize(self, artifacts_dir: str, model_map_path: str):
        """
        Initialize the model client with paths
        
        Args:
            artifacts_dir: Directory containing model artifacts
            model_map_path: Path to model_map.json
        """
        with self._lock:
            self.artifacts_dir = Path(artifacts_dir)
            self.model_map_path = Path(model_map_path)
            
            if not self.artifacts_dir.exists():
                raise FileNotFoundError(f"Artifacts directory not found: {artifacts_dir}")
            
            if not self.model_map_path.exists():
                raise FileNotFoundError(f"Model map not found: {model_map_path}")
            
            # Load model metadata
            with open(self.model_map_path, 'r') as f:
                model_map = json.load(f)
                self.model_metadata = model_map.get('models', {})
            
            self.initialized = True
            current_app.logger.info(f"[MODEL CLIENT] Initialized with {len(self.model_metadata)} models")
    
    def load_model(self, model_key: str, force_reload: bool = False) -> Any:
        """
        Load a model by its key from model_map.json
        
        Args:
            model_key: Key from model_map.json (e.g., 'donor_seeker_match')
            force_reload: Force reload even if cached
            
        Returns:
            Loaded model object
        """
        if not self.initialized:
            raise RuntimeError("ModelClient not initialized. Call initialize() first.")
        
        # Check cache
        if model_key in self.models and not force_reload:
            return self.models[model_key]
        
        # Get model metadata
        if model_key not in self.model_metadata:
            raise ValueError(f"Model '{model_key}' not found in model_map.json")
        
        metadata = self.model_metadata[model_key]
        artifact_path = metadata.get('artifact_path')
        
        if not artifact_path:
            raise ValueError(f"No artifact_path specified for model '{model_key}'")
        
        # Construct full path
        full_path = self.artifacts_dir.parent / artifact_path
        
        if not full_path.exists():
            raise FileNotFoundError(f"Model artifact not found: {full_path}")
        
        # Load model with thread safety
        with self._lock:
            try:
                start_time = datetime.now()
                model = joblib.load(full_path)
                load_time = (datetime.now() - start_time).total_seconds() * 1000
                
                self.models[model_key] = model
                
                current_app.logger.info(
                    f"[MODEL CLIENT] Loaded '{model_key}' v{metadata.get('version')} "
                    f"in {load_time:.2f}ms"
                )
                
                return model
                
            except Exception as e:
                current_app.logger.error(f"[MODEL CLIENT] Failed to load '{model_key}': {str(e)}")
                raise
    
    def predict(self, model_key: str, features: Any, **kwargs) -> Any:
        """
        Make prediction using specified model
        
        Args:
            model_key: Model identifier
            features: Feature array/dataframe for prediction
            **kwargs: Additional arguments passed to model.predict()
            
        Returns:
            Model prediction
        """
        model = self.load_model(model_key)
        
        try:
            start_time = datetime.now()
            prediction = model.predict(features, **kwargs)
            inference_time = (datetime.now() - start_time).total_seconds() * 1000
            
            current_app.logger.debug(
                f"[MODEL CLIENT] Prediction for '{model_key}' "
                f"completed in {inference_time:.2f}ms"
            )
            
            return prediction, inference_time
            
        except Exception as e:
            current_app.logger.error(
                f"[MODEL CLIENT] Prediction failed for '{model_key}': {str(e)}"
            )
            raise
    
    def predict_proba(self, model_key: str, features: Any) -> Any:
        """
        Get prediction probabilities (for classification models)
        
        Args:
            model_key: Model identifier
            features: Feature array/dataframe
            
        Returns:
            Prediction probabilities
        """
        model = self.load_model(model_key)
        
        if not hasattr(model, 'predict_proba'):
            raise AttributeError(f"Model '{model_key}' does not support predict_proba")
        
        try:
            start_time = datetime.now()
            probabilities = model.predict_proba(features)
            inference_time = (datetime.now() - start_time).total_seconds() * 1000
            
            current_app.logger.debug(
                f"[MODEL CLIENT] Probability prediction for '{model_key}' "
                f"completed in {inference_time:.2f}ms"
            )
            
            return probabilities, inference_time
            
        except Exception as e:
            current_app.logger.error(
                f"[MODEL CLIENT] Probability prediction failed for '{model_key}': {str(e)}"
            )
            raise
    
    def get_model_info(self, model_key: str) -> Dict[str, Any]:
        """Get metadata for a specific model"""
        if model_key not in self.model_metadata:
            raise ValueError(f"Model '{model_key}' not found")
        return self.model_metadata[model_key]
    
    def list_models(self) -> Dict[str, Dict]:
        """List all available models with metadata"""
        return self.model_metadata
    
    def reload_model(self, model_key: str):
        """Hot-reload a specific model"""
        current_app.logger.info(f"[MODEL CLIENT] Hot-reloading model '{model_key}'")
        return self.load_model(model_key, force_reload=True)
    
    def reload_all_models(self):
        """Reload all models (use with caution in production)"""
        current_app.logger.info("[MODEL CLIENT] Reloading all models")
        for model_key in self.model_metadata.keys():
            try:
                self.load_model(model_key, force_reload=True)
            except Exception as e:
                current_app.logger.error(
                    f"[MODEL CLIENT] Failed to reload '{model_key}': {str(e)}"
                )
    
    def unload_model(self, model_key: str):
        """Remove model from cache to free memory"""
        with self._lock:
            if model_key in self.models:
                del self.models[model_key]
                current_app.logger.info(f"[MODEL CLIENT] Unloaded model '{model_key}'")


# Global instance
model_client = ModelClient()
