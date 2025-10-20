from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100))
    email = db.Column(db.String(150), unique=True, nullable=True)  # optional
    phone = db.Column(db.String(15), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin, donor, staff
    status = db.Column(db.String(20), default="inactive")  # active, inactive, blocked, deleted
    is_phone_verified = db.Column(db.Boolean, default=False)
    is_email_verified = db.Column(db.Boolean, default=False)
    profile_pic_url = db.Column(db.Text, nullable=True)  # path/key in S3
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    district = db.Column(db.String(100))
    state = db.Column(db.String(50), default="Kerala")
    pincode = db.Column(db.String(10))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # donor = db.relationship("Donor", uselist=False, back_populates="user")  # Commented out - using separate models
    staff = db.relationship("HospitalStaff", uselist=False, back_populates="user", foreign_keys="[HospitalStaff.user_id]")
    
    def set_password(self, password):
        """Hash and set password"""
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify password"""
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)


class Donor(db.Model):
    __tablename__ = "donors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth = db.Column(db.Date)
    blood_group = db.Column(db.String(5), nullable=False)
    gender = db.Column(db.String(20))
    is_available = db.Column(db.Boolean, default=True)
    last_donation_date = db.Column(db.Date)
    reliability_score = db.Column(db.Float, default=0)
    location_lat = db.Column(db.Numeric(9,6))
    location_lng = db.Column(db.Numeric(9,6))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship("User", backref="donor")
    matches = db.relationship("Match", back_populates="donor")


class Hospital(db.Model):
    __tablename__ = "hospitals"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    district = db.Column(db.String(100))
    city = db.Column(db.String(100))
    location = db.Column(db.String(255))  # For display purposes
    license_number = db.Column(db.String(100), unique=True)
    is_verified = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)  # For homepage filtering
    featured = db.Column(db.Boolean, default=False)  # For homepage featured hospitals
    contact_number = db.Column(db.String(20))
    blood_type = db.Column(db.String(5))  # Primary blood type available
    next_camp_date = db.Column(db.Date)  # Next blood donation camp
    image_url = db.Column(db.Text)  # Hospital image
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    requests = db.relationship("Request", back_populates="hospital")
    staff_relation = db.relationship("HospitalStaff", back_populates="hospital", uselist=False, cascade="all, delete-orphan")
    
    def get_staff_status(self):
        """Get the status of the hospital's staff member"""
        if not self.staff_relation:
            return {"has_staff": False, "status": None, "user_status": None}
        
        staff_user = self.staff_relation.user
        return {
            "has_staff": True,
            "staff_id": self.staff_relation.user_id,
            "staff_status": self.staff_relation.status,
            "user_status": staff_user.status if staff_user else "deleted",
            "user_exists": staff_user is not None,
            "is_active": staff_user and staff_user.status == "active" and self.staff_relation.status == "active"
        }
    
    def should_be_verified(self):
        """Check if hospital should be verified (has active staff)"""
        staff_status = self.get_staff_status()
        return staff_status["has_staff"] and staff_status["is_active"]


class HospitalStaff(db.Model):
    __tablename__ = "hospital_staff"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True)  # One user can only be staff for one hospital
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id", ondelete="CASCADE"), unique=True)  # One hospital can only have one staff
    invited_by = db.Column(db.Integer, db.ForeignKey("users.id"))  # admin
    status = db.Column(db.String(20), default="pending")  # pending, active, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="staff", foreign_keys=[user_id])
    hospital = db.relationship("Hospital", back_populates="staff_relation")


class Request(db.Model):
    __tablename__ = "blood_requests"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"))
    patient_name = db.Column(db.String(255), nullable=False)
    blood_group = db.Column(db.String(5), nullable=False)
    units_required = db.Column(db.Integer, nullable=False)
    urgency = db.Column(db.String(20), default='medium')
    status = db.Column(db.String(20), default='pending')
    description = db.Column(db.Text)
    contact_person = db.Column(db.String(255))
    contact_phone = db.Column(db.String(20))
    required_by = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = db.relationship("Hospital", back_populates="requests")
    matches = db.relationship("Match", back_populates="request")


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("blood_requests.id", ondelete="CASCADE"))
    donor_id = db.Column(db.Integer, db.ForeignKey("donors.id", ondelete="CASCADE"))
    status = db.Column(db.String(50), default="pending")
    matched_at = db.Column(db.DateTime, default=datetime.utcnow)
    confirmed_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    notes = db.Column(db.Text)

    request = db.relationship("Request", back_populates="matches")
    donor = db.relationship("Donor", back_populates="matches")


class DonationHistory(db.Model):
    __tablename__ = "donation_history"

    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey("donors.id", ondelete="CASCADE"))
    request_id = db.Column(db.Integer, db.ForeignKey("blood_requests.id", ondelete="CASCADE"))
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id", ondelete="CASCADE"))
    units = db.Column(db.Integer, nullable=False)
    donation_date = db.Column(db.DateTime, default=datetime.utcnow)


class RefreshToken(db.Model):
    __tablename__ = "refresh_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = db.Column(db.Text, nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    revoked_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship("User", backref="refresh_tokens")


class OTPSession(db.Model):
    __tablename__ = "otp_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"))
    channel = db.Column(db.String(10), nullable=False)  # phone, email
    destination = db.Column(db.String(150), nullable=False)
    otp_hash = db.Column(db.Text, nullable=False)  # store hashed OTP
    attempts_left = db.Column(db.Integer, default=3)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ============================================================================
# ML Models and Predictions
# ============================================================================

class ModelArtifact(db.Model):
    """Track ML model versions and metadata"""
    __tablename__ = "model_artifacts"

    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(100), nullable=False, unique=True)
    version = db.Column(db.String(50), nullable=False)
    artifact_path = db.Column(db.String(500), nullable=False)
    metadata_json = db.Column(db.JSON)  # Store model metrics, features, etc.
    is_active = db.Column(db.Boolean, default=True)
    deployed_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MatchPrediction(db.Model):
    """Store ML-based donor-request match predictions"""
    __tablename__ = "match_predictions"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("blood_requests.id", ondelete="CASCADE"), nullable=False)
    donor_id = db.Column(db.Integer, db.ForeignKey("donors.id", ondelete="CASCADE"), nullable=False)
    
    # Prediction scores
    match_score = db.Column(db.Float)  # Overall match score
    availability_score = db.Column(db.Float)  # Availability prediction
    response_time_hours = db.Column(db.Float)  # Predicted response time
    reliability_score = db.Column(db.Float)  # Donor reliability
    
    # Model metadata
    model_version = db.Column(db.String(50))
    feature_vector = db.Column(db.JSON)  # Store features used for prediction
    
    # Status tracking
    rank = db.Column(db.Integer)  # Rank in the match list
    notified = db.Column(db.Boolean, default=False)
    actual_response_time = db.Column(db.Float)  # For model evaluation
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DemandForecast(db.Model):
    """Store blood demand forecasts by district and blood group"""
    __tablename__ = "demand_forecasts"

    id = db.Column(db.Integer, primary_key=True)
    district = db.Column(db.String(100), nullable=False)
    blood_group = db.Column(db.String(5), nullable=False)
    
    # Forecast data
    forecast_date = db.Column(db.Date, nullable=False)
    predicted_demand = db.Column(db.Float, nullable=False)
    confidence_lower = db.Column(db.Float)  # Lower confidence interval
    confidence_upper = db.Column(db.Float)  # Upper confidence interval
    
    # Metadata
    model_version = db.Column(db.String(50))
    actual_demand = db.Column(db.Float)  # For evaluation
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate forecasts
    __table_args__ = (
        db.UniqueConstraint('district', 'blood_group', 'forecast_date', name='unique_forecast'),
    )


class ModelPredictionLog(db.Model):
    """Log all ML model predictions for monitoring and debugging"""
    __tablename__ = "model_prediction_logs"

    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(100), nullable=False)
    model_version = db.Column(db.String(50))
    
    # Request details
    endpoint = db.Column(db.String(200))
    input_data = db.Column(db.JSON)
    
    # Prediction results
    prediction_output = db.Column(db.JSON)
    inference_time_ms = db.Column(db.Float)  # Latency tracking
    
    # Status
    success = db.Column(db.Boolean, default=True)
    error_message = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
