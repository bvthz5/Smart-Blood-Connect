"""
FeatureBuilder - Generate feature vectors for ML models
Handles feature engineering from database objects
"""

import numpy as np
import pandas as pd
from datetime import datetime, date
from typing import Dict, List, Tuple, Optional
from math import radians, cos, sin, asin, sqrt


class FeatureBuilder:
    """Build feature vectors for ML models from DB objects"""
    
    # Blood group compatibility matrix
    BLOOD_COMPATIBILITY = {
        'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        'O+': ['O+', 'A+', 'B+', 'AB+'],
        'A-': ['A-', 'A+', 'AB-', 'AB+'],
        'A+': ['A+', 'AB+'],
        'B-': ['B-', 'B+', 'AB-', 'AB+'],
        'B+': ['B+', 'AB+'],
        'AB-': ['AB-', 'AB+'],
        'AB+': ['AB+']
    }
    
    URGENCY_MAPPING = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'critical': 4
    }
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate Haversine distance between two coordinates in kilometers
        
        Args:
            lat1, lon1: First coordinate
            lat2, lon2: Second coordinate
            
        Returns:
            Distance in kilometers
        """
        if None in [lat1, lon1, lat2, lon2]:
            return 999.0  # Default large distance for missing coordinates
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth radius in kilometers
        r = 6371
        
        return round(c * r, 2)
    
    @staticmethod
    def is_blood_compatible(donor_blood: str, required_blood: str) -> bool:
        """
        Check if donor blood group is compatible with required blood group
        
        Args:
            donor_blood: Donor's blood group
            required_blood: Required blood group
            
        Returns:
            True if compatible, False otherwise
        """
        if not donor_blood or not required_blood:
            return False
        
        donor_blood = donor_blood.strip().upper()
        required_blood = required_blood.strip().upper()
        
        return required_blood in FeatureBuilder.BLOOD_COMPATIBILITY.get(donor_blood, [])
    
    @staticmethod
    def days_since_date(target_date: Optional[date]) -> int:
        """Calculate days since a given date"""
        if not target_date:
            return 999  # Large number for never donated
        
        if isinstance(target_date, datetime):
            target_date = target_date.date()
        
        return (date.today() - target_date).days
    
    @staticmethod
    def get_time_features(dt: Optional[datetime] = None) -> Dict[str, int]:
        """Extract time-based features"""
        if dt is None:
            dt = datetime.now()
        
        return {
            'hour_of_day': dt.hour,
            'day_of_week': dt.weekday(),  # 0=Monday, 6=Sunday
            'day_of_month': dt.day,
            'month': dt.month,
            'is_weekend': 1 if dt.weekday() >= 5 else 0,
            'is_business_hours': 1 if 9 <= dt.hour <= 17 else 0
        }
    
    @classmethod
    def build_donor_seeker_features(
        cls,
        donor,
        request,
        hospital
    ) -> Dict[str, float]:
        """
        Build features for donor-seeker matching model
        
        Args:
            donor: Donor object from DB
            request: Request object from DB
            hospital: Hospital object from DB
            
        Returns:
            Feature dictionary
        """
        # Calculate distance
        distance = cls.calculate_distance(
            donor.location_lat,
            donor.location_lng,
            hospital.location_lat if hasattr(hospital, 'location_lat') else None,
            hospital.location_lng if hasattr(hospital, 'location_lng') else None
        )
        
        # Blood compatibility
        is_compatible = cls.is_blood_compatible(donor.blood_group, request.blood_group)
        
        # Donor availability
        days_since_donation = cls.days_since_date(donor.last_donation_date)
        
        # Urgency level
        urgency_score = cls.URGENCY_MAPPING.get(request.urgency.lower(), 2)
        
        features = {
            'blood_group_compatibility': 1.0 if is_compatible else 0.0,
            'distance_km': distance,
            'donor_availability': 1.0 if donor.is_available else 0.0,
            'last_donation_days': min(days_since_donation, 365),  # Cap at 1 year
            'reliability_score': float(donor.reliability_score or 0.0),
            'urgency_level': float(urgency_score),
            'units_required': float(request.units_required or 1)
        }
        
        return features
    
    @classmethod
    def build_availability_features(
        cls,
        donor,
        request_time: Optional[datetime] = None
    ) -> Dict[str, float]:
        """
        Build features for donor availability prediction
        
        Args:
            donor: Donor object
            request_time: Time of request (default: now)
            
        Returns:
            Feature dictionary
        """
        if request_time is None:
            request_time = datetime.now()
        
        # Time features
        time_features = cls.get_time_features(request_time)
        
        # Donor history
        days_since_donation = cls.days_since_date(donor.last_donation_date)
        
        # Calculate total donations (would need DonationHistory query in real implementation)
        total_donations = 0  # Placeholder - should query DonationHistory
        
        features = {
            'time_since_last_donation': min(days_since_donation, 365),
            'total_donations': float(total_donations),
            'response_rate': float(donor.reliability_score or 0.5),  # Proxy
            'day_of_week': float(time_features['day_of_week']),
            'hour_of_day': float(time_features['hour_of_day']),
            'is_weekend': float(time_features['is_weekend']),
            'is_business_hours': float(time_features['is_business_hours'])
        }
        
        return features
    
    @classmethod
    def build_response_time_features(
        cls,
        donor,
        request,
        hospital
    ) -> Dict[str, float]:
        """
        Build features for response time prediction
        
        Args:
            donor: Donor object
            request: Request object
            hospital: Hospital object
            
        Returns:
            Feature dictionary
        """
        distance = cls.calculate_distance(
            donor.location_lat,
            donor.location_lng,
            hospital.location_lat if hasattr(hospital, 'location_lat') else None,
            hospital.location_lng if hasattr(hospital, 'location_lng') else None
        )
        
        time_features = cls.get_time_features()
        urgency_score = cls.URGENCY_MAPPING.get(request.urgency.lower(), 2)
        
        # Calculate donor age (if DOB available)
        donor_age = 30  # Default
        if hasattr(donor, 'date_of_birth') and donor.date_of_birth:
            today = date.today()
            dob = donor.date_of_birth
            donor_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        features = {
            'distance_km': distance,
            'donor_age': float(donor_age),
            'past_response_times': 24.0,  # Placeholder - should calculate from history
            'urgency_level': float(urgency_score),
            'time_of_day': float(time_features['hour_of_day']),
            'is_weekend': float(time_features['is_weekend'])
        }
        
        return features
    
    @classmethod
    def build_reliability_features(cls, donor, donation_history: List) -> Dict[str, float]:
        """
        Build features for donor reliability scoring
        
        Args:
            donor: Donor object
            donation_history: List of donation records
            
        Returns:
            Feature dictionary
        """
        total_donations = len(donation_history)
        
        # Calculate completion and cancellation rates
        # (This is simplified - real implementation would track match outcomes)
        completion_rate = 0.85  # Placeholder
        cancellation_rate = 0.05  # Placeholder
        
        # Calculate average response time
        avg_response_time = 24.0  # Placeholder in hours
        
        # Calculate tenure
        if hasattr(donor, 'created_at') and donor.created_at:
            tenure_days = (datetime.now() - donor.created_at).days
        else:
            tenure_days = 30
        
        features = {
            'total_donations': float(total_donations),
            'completion_rate': completion_rate,
            'cancellation_rate': cancellation_rate,
            'average_response_time': avg_response_time,
            'tenure_days': float(tenure_days)
        }
        
        return features
    
    @classmethod
    def build_demand_forecast_features(
        cls,
        district: str,
        blood_group: str,
        forecast_date: date,
        historical_data: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Build features for demand forecasting
        
        Args:
            district: District name
            blood_group: Blood group
            forecast_date: Date to forecast for
            historical_data: Historical demand data
            
        Returns:
            Feature DataFrame
        """
        # Time-based features
        features = {
            'district': district,
            'blood_group': blood_group,
            'day_of_week': forecast_date.weekday(),
            'day_of_month': forecast_date.day,
            'month': forecast_date.month,
            'quarter': (forecast_date.month - 1) // 3 + 1,
            'is_weekend': 1 if forecast_date.weekday() >= 5 else 0
        }
        
        # Add historical demand features if available
        if historical_data is not None and not historical_data.empty:
            # Calculate rolling averages, trends, etc.
            features['historical_mean'] = historical_data['demand'].mean()
            features['historical_std'] = historical_data['demand'].std()
            features['recent_trend'] = historical_data['demand'].tail(7).mean()
        else:
            features['historical_mean'] = 10.0
            features['historical_std'] = 3.0
            features['recent_trend'] = 10.0
        
        return pd.DataFrame([features])
    
    @classmethod
    def features_to_array(cls, features: Dict[str, float], feature_order: List[str]) -> np.ndarray:
        """
        Convert feature dictionary to numpy array in specified order
        
        Args:
            features: Feature dictionary
            feature_order: List of feature names in correct order
            
        Returns:
            Numpy array of features
        """
        return np.array([[features.get(f, 0.0) for f in feature_order]])
    
    @classmethod
    def features_to_dataframe(cls, features: Dict[str, float]) -> pd.DataFrame:
        """Convert feature dictionary to pandas DataFrame"""
        return pd.DataFrame([features])
