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
import gzip
import pickle
import glob
from huggingface_hub import hf_hub_download


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
        hf_repo_id = metadata.get('hf_repo_id')
        hf_filename = metadata.get('hf_filename')
        
        if not artifact_path and not (hf_repo_id and hf_filename):
            raise ValueError(f"No artifact_path or Hugging Face info specified for model '{model_key}'")

        # If Hugging Face details are provided in metadata, download via hf_hub
        if hf_repo_id and hf_filename:
            try:
                token = os.environ.get("HUGGINGFACE_HUB_TOKEN")
                start_time = datetime.now()
                local_path = hf_hub_download(repo_id=hf_repo_id, filename=hf_filename, use_auth_token=token)
                model = joblib.load(local_path)
                load_time = (datetime.now() - start_time).total_seconds() * 1000
                with self._lock:
                    self.models[model_key] = model
                current_app.logger.info(
                    f"[MODEL CLIENT] Loaded '{model_key}' from HF repo {hf_repo_id} file {hf_filename} "
                    f"in {load_time:.2f}ms"
                )
                return model
            except Exception as e:
                current_app.logger.error(f"[MODEL CLIENT] HF load failed for '{model_key}': {str(e)}")
                raise

        # Support artifact_path with hf:// schema -> hf://<repo_id>/<filename>
        if isinstance(artifact_path, str) and artifact_path.startswith('hf://'):
            try:
                path_part = artifact_path[len('hf://'):]
                repo_and_file = path_part.split('/', 1)
                if len(repo_and_file) != 2:
                    raise ValueError(f"Invalid HF artifact_path format: {artifact_path}")
                repo_id, filename = repo_and_file
                token = os.environ.get("HUGGINGFACE_HUB_TOKEN")
                start_time = datetime.now()
                local_path = hf_hub_download(repo_id=repo_id, filename=filename, use_auth_token=token)
                model = joblib.load(local_path)
                load_time = (datetime.now() - start_time).total_seconds() * 1000
                with self._lock:
                    self.models[model_key] = model
                current_app.logger.info(
                    f"[MODEL CLIENT] Loaded '{model_key}' from HF path {artifact_path} in {load_time:.2f}ms"
                )
                return model
            except Exception as e:
                current_app.logger.error(f"[MODEL CLIENT] HF path load failed for '{model_key}': {str(e)}")
                raise
        
        # Construct full path for local artifact
        full_path = self.artifacts_dir.parent / artifact_path
        
        # Resolve alternative compressed artifact if the expected file is missing
        gzip_path = None
        if not full_path.exists():
            # Prefer <artifact>.gz next to the expected path
            p_str = str(full_path)
            if not p_str.endswith('.gz'):
                gzip_path_candidate = Path(p_str + '.gz')
            else:
                gzip_path_candidate = full_path
            # If .gz file doesn't exist yet, check for split parts and reconstruct
            if not gzip_path_candidate.exists():
                part_glob = f"{str(gzip_path_candidate)}.part*"
                part_files = sorted(glob.glob(part_glob))
                if part_files:
                    try:
                        current_app.logger.info(
                            f"[MODEL CLIENT] Reconstructing compressed artifact from parts: {part_glob}"
                        )
                        with open(gzip_path_candidate, "wb") as f_out:
                            for part in part_files:
                                with open(part, "rb") as f_in:
                                    f_out.write(f_in.read())
                    except Exception as e:
                        current_app.logger.error(
                            f"[MODEL CLIENT] Failed to reconstruct artifact: {str(e)}"
                        )
                        raise
            if gzip_path_candidate.exists():
                gzip_path = gzip_path_candidate
            else:
                raise FileNotFoundError(f"Model artifact not found: {full_path}")
        
        # Load model with thread safety
        with self._lock:
            try:
                start_time = datetime.now()
                if gzip_path is not None:
                    with gzip.open(gzip_path, 'rb') as f:
                        model = pickle.load(f)
                else:
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
