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


class HospitalStaff(db.Model):
    __tablename__ = "hospital_staff"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id", ondelete="CASCADE"))
    invited_by = db.Column(db.Integer, db.ForeignKey("users.id"))  # admin
    status = db.Column(db.String(20), default="pending")  # pending, active, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="staff", foreign_keys=[user_id])
    # hospital = db.relationship("Hospital", back_populates="staff")  # Commented out - no staff relationship in Hospital


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
