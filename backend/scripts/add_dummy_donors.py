"""
Add dummy donor data to the database.
This script adds donors in different cities of Kottayam district.
"""

import sys
import os
from datetime import datetime, date
from werkzeug.security import generate_password_hash
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import User, Donor

# Create Flask app context
app = create_app()

# Kottayam district cities with their pincodes
KOTTAYAM_CITIES = {
    'Pala': '686575',
    'Erattupetta': '686121',
    'Ettumanoor': '686631',
    'Koodalloor': '686636',
    'Kidangoor': '686572',
    'Cherpunkal': '686584',
    'Uzhavoor': '686634',
    'Ramapuram': '686576',
    'Kaduthuruthy': '686604',
    'Kuravilangaud': '686633',
    'Vempally': '686019',
    'Kottayam': '686001',
    'Somkanthy': '686611'
}

# Sample names for generating dummy data
FIRST_NAMES = [
    'Arun', 'Biju', 'Chacko', 'David', 'Eldhose', 'Francis', 'George', 'Harry',
    'Irfan', 'James', 'Kevin', 'Linto', 'Mathew', 'Noble', 'Omana', 'Philip',
    'Qureshi', 'Rajesh', 'Santhosh', 'Thomas', 'Unni', 'Varghese', 'William',
    'Xavier', 'Yohannan', 'Zachariah', 'Anna', 'Bindu', 'Chinnu', 'Diana'
]

LAST_NAMES = [
    'Abraham', 'Benjamin', 'Chakko', 'Daniel', 'Eapen', 'Fernandez', 'George',
    'Hassan', 'Ittoop', 'Jacob', 'Koshy', 'Luke', 'Mathew', 'Nair', 'Oommen',
    'Paul', 'Quadros', 'Rajan', 'Sebastian', 'Thomas', 'Ulahannan', 'Varkey',
    'Wilson', 'Xavier', 'Yohannan', 'Zacharias', 'Joseph', 'Kurian', 'Philip'
]

BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
GENDERS = ['male', 'female']

def generate_phone():
    """Generate a unique 10-digit phone number"""
    import random
    while True:
        phone = f"919{random.randint(100000000, 999999999)}"
        if not User.query.filter_by(phone=phone).first():
            return phone

def generate_email(first_name, last_name):
    """Generate a unique email address"""
    import random
    base_email = f"{first_name.lower()}.{last_name.lower()}"
    while True:
        email = f"{base_email}{random.randint(1, 999)}@example.com"
        if not User.query.filter_by(email=email).first():
            return email

def create_dummy_donors():
    """Create dummy donor records"""
    import random
    from datetime import timedelta

    with app.app_context():
        # First update existing donors
        existing_donors = User.query.filter_by(role='donor').all()
        for user in existing_donors:
            city = random.choice(list(KOTTAYAM_CITIES.keys()))
            user.city = city
            user.district = 'Kottayam'
            user.state = 'Kerala'
            user.pincode = KOTTAYAM_CITIES[city]
            user.status = 'active'
            user.is_phone_verified = True
            user.is_email_verified = True
            user.set_password('Thaz@123')

        db.session.commit()
        print(f"Updated {len(existing_donors)} existing donors")

        # Now create new donors
        new_donors_count = 50  # Create 50 new donors
        created_count = 0

        for _ in range(new_donors_count):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            city = random.choice(list(KOTTAYAM_CITIES.keys()))
            
            # Create user
            user = User(
                first_name=first_name,
                last_name=last_name,
                email=generate_email(first_name, last_name),
                phone=generate_phone(),
                role='donor',
                status='active',
                is_phone_verified=True,
                is_email_verified=True,
                city=city,
                district='Kottayam',
                state='Kerala',
                pincode=KOTTAYAM_CITIES[city],
                address=f"Test Address, {city}, Kottayam"
            )
            user.set_password('Thaz@123')

            # Create donor profile
            donor = Donor(
                user=user,
                blood_group=random.choice(BLOOD_GROUPS),
                gender=random.choice(GENDERS),
                date_of_birth=date(
                    random.randint(1970, 2000),
                    random.randint(1, 12),
                    random.randint(1, 28)
                ),
                is_available=True,
                reliability_score=random.uniform(0, 5),
                # Random coordinates within Kottayam district
                location_lat=random.uniform(9.2, 9.8),
                location_lng=random.uniform(76.4, 76.8)
            )

            # Add random last donation date for some donors
            if random.random() < 0.7:  # 70% chance of having donated before
                days_ago = random.randint(90, 365)  # Last donation between 3 months and 1 year ago
                donor.last_donation_date = date.today() - timedelta(days=days_ago)

            try:
                db.session.add(user)
                db.session.add(donor)
                db.session.commit()
                created_count += 1
                print(f"Created donor: {first_name} {last_name} in {city}")
            except Exception as e:
                print(f"Error creating donor: {e}")
                db.session.rollback()

        print(f"\nSuccessfully created {created_count} new donors")
        print(f"Total donors after script: {User.query.filter_by(role='donor').count()}")

if __name__ == '__main__':
    create_dummy_donors()