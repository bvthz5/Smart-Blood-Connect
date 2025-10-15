#!/usr/bin/env python3
"""
Script to populate the SmartBlood database with realistic dummy data.
This script safely adds dummy data to all tables without crashing the database.
"""

import os
import sys
from datetime import datetime, date, timedelta
from decimal import Decimal
import random
from werkzeug.security import generate_password_hash

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db, User, Donor, Hospital, HospitalStaff, Request, Match, DonationHistory, RefreshToken, OTPSession

def create_app_context():
    """Create Flask app context for database operations."""
    app = create_app()
    return app

def generate_phone_number():
    """Generate a random Indian phone number."""
    prefixes = ['91', '92', '93', '94', '95', '96', '97', '98', '99']
    prefix = random.choice(prefixes)
    number = ''.join([str(random.randint(0, 9)) for _ in range(8)])
    return f"+91{prefix}{number}"

def generate_email(first_name, last_name, role='donor'):
    """Generate email from name with role prefix to ensure uniqueness."""
    domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com']
    domain = random.choice(domains)
    # Add role prefix and random number to ensure uniqueness
    random_num = random.randint(100, 999)
    clean_first = first_name.lower().replace('dr. ', '').replace(' ', '')
    clean_last = last_name.lower().replace(' ', '')
    return f"{role}_{clean_first}_{clean_last}_{random_num}@{domain}"

def get_random_blood_group():
    """Get a random blood group."""
    blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    return random.choice(blood_groups)

def get_random_district():
    """Get a random Kerala district."""
    districts = [
        'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam',
        'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
        'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
    ]
    return random.choice(districts)

def get_random_city(district):
    """Get a random city in the given district."""
    city_map = {
        'Thiruvananthapuram': ['Thiruvananthapuram', 'Neyyattinkara', 'Attingal'],
        'Kollam': ['Kollam', 'Paravur', 'Karunagapally'],
        'Pathanamthitta': ['Pathanamthitta', 'Adoor', 'Ranni'],
        'Alappuzha': ['Alappuzha', 'Cherthala', 'Kayamkulam'],
        'Kottayam': ['Kottayam', 'Changanassery', 'Pala'],
        'Idukki': ['Thodupuzha', 'Kattappana', 'Munnar'],
        'Ernakulam': ['Kochi', 'Aluva', 'Perumbavoor'],
        'Thrissur': ['Thrissur', 'Guruvayur', 'Kodungallur'],
        'Palakkad': ['Palakkad', 'Ottapalam', 'Chittur'],
        'Malappuram': ['Malappuram', 'Manjeri', 'Perinthalmanna'],
        'Kozhikode': ['Kozhikode', 'Vadakara', 'Koyilandy'],
        'Wayanad': ['Kalpetta', 'Sultan Bathery', 'Mananthavady'],
        'Kannur': ['Kannur', 'Thalassery', 'Payyannur'],
        'Kasaragod': ['Kasaragod', 'Kanhangad', 'Manjeshwar']
    }
    return random.choice(city_map.get(district, [district]))

def populate_users():
    """Populate users table with dummy data."""
    print("Creating dummy users...")
    
    # Create admin user if not exists
    admin_user = User.query.filter_by(email='admin@smartblood.com').first()
    if not admin_user:
        admin_user = User(
            first_name='Admin',
            last_name='User',
            email='admin@smartblood.com',
            phone=generate_phone_number(),
            password_hash=generate_password_hash('admin123'),
            role='admin',
            status='active',
            is_phone_verified=True,
            is_email_verified=True,
            address='SmartBlood Admin Office',
            city='Thiruvananthapuram',
            district='Thiruvananthapuram',
            state='Kerala',
            pincode='695001',
            created_at=datetime.utcnow() - timedelta(days=30)
        )
        db.session.add(admin_user)
        print("✓ Admin user created")
    else:
        print("✓ Admin user already exists")

    # Create donor users
    donor_names = [
        ('Rajesh', 'Kumar'), ('Priya', 'Menon'), ('Suresh', 'Nair'), ('Anitha', 'Pillai'),
        ('Vijay', 'Krishnan'), ('Deepa', 'Lakshmi'), ('Manoj', 'Varma'), ('Sunitha', 'Rajan'),
        ('Krishna', 'Das'), ('Lakshmi', 'Devi'), ('Ravi', 'Chandran'), ('Meera', 'Suresh'),
        ('Arun', 'Kumar'), ('Sujatha', 'Nair'), ('Gopal', 'Menon'), ('Radha', 'Krishnan'),
        ('Sathish', 'Pillai'), ('Kavitha', 'Varma'), ('Ramesh', 'Das'), ('Uma', 'Chandran'),
        ('Babu', 'Rajan'), ('Geetha', 'Kumar'), ('Sankar', 'Nair'), ('Rekha', 'Menon'),
        ('Mohan', 'Pillai'), ('Vasantha', 'Varma'), ('Kumar', 'Das'), ('Shanti', 'Krishnan'),
        ('Raju', 'Chandran'), ('Kamala', 'Rajan'), ('Sekhar', 'Kumar'), ('Pushpa', 'Nair'),
        ('Narayan', 'Menon'), ('Sarala', 'Pillai'), ('Venkat', 'Varma'), ('Lalitha', 'Das'),
        ('Raghu', 'Krishnan'), ('Indira', 'Chandran'), ('Srinivas', 'Rajan'), ('Kumari', 'Kumar'),
        ('Prakash', 'Nair'), ('Savitri', 'Menon'), ('Raman', 'Pillai'), ('Lakshmi', 'Varma'),
        ('Ganesh', 'Das'), ('Parvathi', 'Krishnan'), ('Murugan', 'Chandran'), ('Amma', 'Rajan')
    ]

    for i, (first_name, last_name) in enumerate(donor_names):
        # Check if user already exists
        existing_user = User.query.filter_by(
            first_name=first_name, 
            last_name=last_name
        ).first()
        
        if not existing_user:
            district = get_random_district()
            city = get_random_city(district)
            
            user = User(
                first_name=first_name,
                last_name=last_name,
                email=generate_email(first_name, last_name, 'donor'),
                phone=generate_phone_number(),
                password_hash=generate_password_hash('password123'),
                role='donor',
                status='active',
                is_phone_verified=random.choice([True, True, True, False]),  # 75% verified
                is_email_verified=random.choice([True, True, False]),  # 66% verified
                address=f"House {random.randint(1, 999)}, {city}",
                city=city,
                district=district,
                state='Kerala',
                pincode=f"{random.randint(600000, 699999)}",
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365)),
                last_login=datetime.utcnow() - timedelta(days=random.randint(1, 30))
            )
            db.session.add(user)
    
    db.session.commit()
    print(f"✓ Created {len(donor_names)} donor users")

def populate_donors():
    """Populate donors table with dummy data."""
    print("Creating dummy donors...")
    
    # Get all donor users
    donor_users = User.query.filter_by(role='donor').all()
    
    for user in donor_users:
        # Check if donor profile already exists
        existing_donor = Donor.query.filter_by(user_id=user.id).first()
        
        if not existing_donor:
            # Calculate age-appropriate birth date
            age = random.randint(18, 65)
            birth_date = date.today() - timedelta(days=age * 365 + random.randint(0, 365))
            
            # Last donation date (some donors have never donated)
            last_donation = None
            if random.choice([True, True, False]):  # 66% have donated before
                last_donation = date.today() - timedelta(days=random.randint(30, 365))
            
            donor = Donor(
                user_id=user.id,
                date_of_birth=birth_date,
                blood_group=get_random_blood_group(),
                gender=random.choice(['Male', 'Female', 'Other']),
                is_available=random.choice([True, True, True, False]),  # 75% available
                last_donation_date=last_donation,
                reliability_score=round(random.uniform(0.5, 1.0), 2),
                location_lat=Decimal(str(round(random.uniform(8.0, 12.5), 6))),
                location_lng=Decimal(str(round(random.uniform(74.0, 77.5), 6))),
                created_at=user.created_at,
                updated_at=datetime.utcnow()
            )
            db.session.add(donor)
    
    db.session.commit()
    print(f"✓ Created donor profiles for {len(donor_users)} users")

def populate_hospitals():
    """Populate hospitals table with dummy data."""
    print("Creating dummy hospitals...")
    
    hospital_data = [
        ('Medical College Hospital', 'medicalcollege@hospital.com', '0471-2444270', 'Medical College, Thiruvananthapuram', 'Thiruvananthapuram', 'Thiruvananthapuram', 'MCH-TVM-001'),
        ('Amrita Institute of Medical Sciences', 'info@aims.amrita.edu', '0484-2851234', 'AIMS Ponekkara, Kochi', 'Ernakulam', 'Kochi', 'AIMS-ECK-002'),
        ('KIMS Hospital', 'info@kims.com', '0487-2881234', 'KIMS Hospital, Thiruvananthapuram', 'Thiruvananthapuram', 'Thiruvananthapuram', 'KIMS-TVM-003'),
        ('Aster Medcity', 'info@astermedcity.com', '0484-6699999', 'Aster Medcity, Kochi', 'Ernakulam', 'Kochi', 'ASTER-ECK-004'),
        ('Lakeshore Hospital', 'info@lakeshorehospital.com', '0484-2701033', 'Lakeshore Hospital, Kochi', 'Ernakulam', 'Kochi', 'LAKE-ECK-005'),
        ('Rajagiri Hospital', 'info@rajagirihospital.com', '0484-2701033', 'Rajagiri Hospital, Aluva', 'Ernakulam', 'Aluva', 'RAJA-ECK-006'),
        ('Baby Memorial Hospital', 'info@babymhospital.com', '0495-2727272', 'Baby Memorial Hospital, Kozhikode', 'Kozhikode', 'Kozhikode', 'BABY-KZK-007'),
        ('Malabar Hospital', 'info@malabarhospital.com', '0495-2721234', 'Malabar Hospital, Kozhikode', 'Kozhikode', 'Kozhikode', 'MAL-KZK-008'),
        ('Kottayam Medical College', 'info@kmc.com', '0481-2597141', 'Kottayam Medical College, Kottayam', 'Kottayam', 'Kottayam', 'KMC-KTM-009'),
        ('Pushpagiri Medical College', 'info@pushpagiri.com', '0481-2597141', 'Pushpagiri Medical College, Thiruvalla', 'Pathanamthitta', 'Thiruvalla', 'PMC-PTM-010'),
        ('Government Medical College', 'info@gmcthrissur.com', '0487-2201234', 'GMC Thrissur, Thrissur', 'Thrissur', 'Thrissur', 'GMC-TSR-011'),
        ('Amala Cancer Hospital', 'info@amalahospital.com', '0487-2301234', 'Amala Cancer Hospital, Thrissur', 'Thrissur', 'Thrissur', 'AMALA-TSR-012'),
        ('Government Medical College', 'info@gmcpalakkad.com', '0491-2521234', 'GMC Palakkad, Palakkad', 'Palakkad', 'Palakkad', 'GMC-PKD-013'),
        ('District Hospital', 'info@dhmalappuram.com', '0483-2731234', 'District Hospital, Malappuram', 'Malappuram', 'Malappuram', 'DH-MAL-014'),
        ('Government Medical College', 'info@gmckannur.com', '0497-2701234', 'GMC Kannur, Kannur', 'Kannur', 'Kannur', 'GMC-KNR-015'),
        ('Co-operative Hospital', 'info@coophospital.com', '0497-2701234', 'Co-operative Hospital, Kannur', 'Kannur', 'Kannur', 'COOP-KNR-016'),
        ('Government Medical College', 'info@gmckasaragod.com', '04994-2201234', 'GMC Kasaragod, Kasaragod', 'Kasaragod', 'Kasaragod', 'GMC-KSD-017'),
        ('District Hospital', 'info@dhwayanad.com', '04936-2021234', 'District Hospital, Kalpetta', 'Wayanad', 'Kalpetta', 'DH-WYD-018'),
        ('Government Medical College', 'info@gmcalappuzha.com', '0477-2251234', 'GMC Alappuzha, Alappuzha', 'Alappuzha', 'Alappuzha', 'GMC-ALP-019'),
        ('Government Medical College', 'info@gmckollam.com', '0474-2791234', 'GMC Kollam, Kollam', 'Kollam', 'Kollam', 'GMC-KLM-020')
    ]
    
    for name, email, phone, address, district, city, license in hospital_data:
        # Check if hospital already exists
        existing_hospital = Hospital.query.filter_by(email=email).first()
        
        if not existing_hospital:
            hospital = Hospital(
                name=name,
                email=email,
                phone=phone,
                address=address,
                district=district,
                city=city,
                license_number=license,
                is_verified=random.choice([True, True, True, False]),  # 75% verified
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365)),
                updated_at=datetime.utcnow()
            )
            db.session.add(hospital)
    
    db.session.commit()
    print(f"✓ Created {len(hospital_data)} hospitals")

def populate_hospital_staff():
    """Populate hospital staff table with dummy data."""
    print("Creating dummy hospital staff...")
    
    # Get all hospitals
    hospitals = Hospital.query.all()
    
    # Create staff users
    staff_names = [
        ('Dr. Rajesh', 'Kumar'), ('Dr. Priya', 'Menon'), ('Dr. Suresh', 'Nair'),
        ('Dr. Anitha', 'Pillai'), ('Dr. Vijay', 'Krishnan'), ('Dr. Deepa', 'Lakshmi'),
        ('Dr. Manoj', 'Varma'), ('Dr. Sunitha', 'Rajan'), ('Dr. Krishna', 'Das'),
        ('Dr. Lakshmi', 'Devi'), ('Dr. Ravi', 'Chandran'), ('Dr. Meera', 'Suresh'),
        ('Dr. Arun', 'Kumar'), ('Dr. Sujatha', 'Nair'), ('Dr. Gopal', 'Menon'),
        ('Dr. Radha', 'Krishnan'), ('Dr. Sathish', 'Pillai'), ('Dr. Kavitha', 'Varma'),
        ('Dr. Ramesh', 'Das'), ('Dr. Uma', 'Chandran'), ('Dr. Babu', 'Rajan'),
        ('Dr. Geetha', 'Kumar'), ('Dr. Sankar', 'Nair'), ('Dr. Rekha', 'Menon'),
        ('Dr. Mohan', 'Pillai'), ('Dr. Vasantha', 'Varma'), ('Dr. Kumar', 'Das'),
        ('Dr. Shanti', 'Krishnan'), ('Dr. Raju', 'Chandran'), ('Dr. Kamala', 'Rajan')
    ]
    
    admin_user = User.query.filter_by(role='admin').first()
    
    for i, (first_name, last_name) in enumerate(staff_names):
        # Check if staff user already exists
        existing_user = User.query.filter_by(
            first_name=first_name, 
            last_name=last_name,
            role='staff'
        ).first()
        
        if not existing_user:
            # Create staff user
            hospital = random.choice(hospitals)
            district = hospital.district
            city = hospital.city
            
            user = User(
                first_name=first_name,
                last_name=last_name,
                email=generate_email(first_name.replace('Dr. ', ''), last_name, 'staff'),
                phone=generate_phone_number(),
                password_hash=generate_password_hash('password123'),
                role='staff',
                status='active',
                is_phone_verified=True,
                is_email_verified=True,
                address=f"Staff Quarters, {hospital.name}",
                city=city,
                district=district,
                state='Kerala',
                pincode=f"{random.randint(600000, 699999)}",
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 180)),
                last_login=datetime.utcnow() - timedelta(days=random.randint(1, 7))
            )
            db.session.add(user)
            db.session.flush()  # Get the user ID
            
            # Create hospital staff record
            staff = HospitalStaff(
                user_id=user.id,
                hospital_id=hospital.id,
                invited_by=admin_user.id if admin_user else None,
                status='active',
                created_at=user.created_at
            )
            db.session.add(staff)
    
    db.session.commit()
    print(f"✓ Created {len(staff_names)} hospital staff members")

def populate_blood_requests():
    """Populate blood requests table with dummy data."""
    print("Creating dummy blood requests...")
    
    hospitals = Hospital.query.all()
    patient_names = [
        'Ravi Kumar', 'Sunitha Menon', 'Manoj Nair', 'Deepa Pillai', 'Krishna Das',
        'Lakshmi Devi', 'Suresh Chandran', 'Meera Rajan', 'Arun Kumar', 'Sujatha Nair',
        'Gopal Menon', 'Radha Krishnan', 'Sathish Pillai', 'Kavitha Varma', 'Ramesh Das',
        'Uma Chandran', 'Babu Rajan', 'Geetha Kumar', 'Sankar Nair', 'Rekha Menon',
        'Mohan Pillai', 'Vasantha Varma', 'Kumar Das', 'Shanti Krishnan', 'Raju Chandran',
        'Kamala Rajan', 'Sekhar Kumar', 'Pushpa Nair', 'Narayan Menon', 'Sarala Pillai',
        'Venkat Varma', 'Lalitha Das', 'Raghu Krishnan', 'Indira Chandran', 'Srinivas Rajan',
        'Kumari Kumar', 'Prakash Nair', 'Savitri Menon', 'Raman Pillai', 'Lakshmi Varma'
    ]
    
    contact_persons = [
        'Dr. Rajesh Kumar', 'Dr. Priya Menon', 'Dr. Suresh Nair', 'Dr. Anitha Pillai',
        'Dr. Vijay Krishnan', 'Dr. Deepa Lakshmi', 'Dr. Manoj Varma', 'Dr. Sunitha Rajan',
        'Dr. Krishna Das', 'Dr. Lakshmi Devi', 'Dr. Ravi Chandran', 'Dr. Meera Suresh',
        'Dr. Arun Kumar', 'Dr. Sujatha Nair', 'Dr. Gopal Menon', 'Dr. Radha Krishnan'
    ]
    
    descriptions = [
        'Emergency surgery requiring blood transfusion',
        'Accident victim in critical condition',
        'Childbirth complications',
        'Cancer treatment requiring blood support',
        'Heart surgery patient',
        'Trauma case from road accident',
        'Bleeding disorder patient',
        'Post-operative blood loss',
        'Anemia patient requiring transfusion',
        'Emergency delivery case',
        'Burn victim requiring blood',
        'Organ transplant surgery',
        'Chronic disease patient',
        'Emergency appendectomy',
        'Fracture surgery with blood loss',
        'Pediatric emergency case'
    ]
    
    for i in range(50):  # Create 50 blood requests
        hospital = random.choice(hospitals)
        patient_name = random.choice(patient_names)
        blood_group = get_random_blood_group()
        units_required = random.randint(1, 5)
        urgency = random.choice(['low', 'medium', 'high', 'urgent'])
        status = random.choice(['pending', 'pending', 'pending', 'matched', 'completed', 'cancelled'])
        
        # Required by date (some in past, some in future)
        if random.choice([True, False]):
            required_by = datetime.utcnow() + timedelta(days=random.randint(1, 30))
        else:
            required_by = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        
        request = Request(
            hospital_id=hospital.id,
            patient_name=patient_name,
            blood_group=blood_group,
            units_required=units_required,
            urgency=urgency,
            status=status,
            description=random.choice(descriptions),
            contact_person=random.choice(contact_persons),
            contact_phone=generate_phone_number(),
            required_by=required_by,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
            updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 7))
        )
        db.session.add(request)
    
    db.session.commit()
    print("✓ Created 50 blood requests")

def populate_matches():
    """Populate matches table with dummy data."""
    print("Creating dummy matches...")
    
    requests = Request.query.filter(Request.status.in_(['matched', 'completed'])).all()
    donors = Donor.query.filter_by(is_available=True).all()
    
    for request in requests:
        # Find compatible donors
        compatible_donors = []
        for donor in donors:
            if donor.blood_group == request.blood_group or is_compatible_blood_group(donor.blood_group, request.blood_group):
                compatible_donors.append(donor)
        
        if compatible_donors:
            # Create 1-3 matches per request
            num_matches = random.randint(1, min(3, len(compatible_donors)))
            selected_donors = random.sample(compatible_donors, num_matches)
            
            for donor in selected_donors:
                status = 'completed' if request.status == 'completed' else random.choice(['pending', 'confirmed', 'completed'])
                
                matched_at = request.created_at + timedelta(hours=random.randint(1, 48))
                confirmed_at = None
                completed_at = None
                
                if status in ['confirmed', 'completed']:
                    confirmed_at = matched_at + timedelta(hours=random.randint(1, 24))
                
                if status == 'completed':
                    completed_at = confirmed_at + timedelta(hours=random.randint(1, 48))
                
                match = Match(
                    request_id=request.id,
                    donor_id=donor.id,
                    status=status,
                    matched_at=matched_at,
                    confirmed_at=confirmed_at,
                    completed_at=completed_at,
                    notes=f"Match created for {request.patient_name} at {request.hospital.name}"
                )
                db.session.add(match)
    
    db.session.commit()
    print("✓ Created matches for compatible requests")

def is_compatible_blood_group(donor_group, recipient_group):
    """Check if donor blood group is compatible with recipient."""
    compatibility = {
        'O+': ['O+', 'A+', 'B+', 'AB+'],
        'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
        'A+': ['A+', 'AB+'],
        'A-': ['A+', 'A-', 'AB+', 'AB-'],
        'B+': ['B+', 'AB+'],
        'B-': ['B+', 'B-', 'AB+', 'AB-'],
        'AB+': ['AB+'],
        'AB-': ['AB+', 'AB-']
    }
    return recipient_group in compatibility.get(donor_group, [])

def populate_donation_history():
    """Populate donation history table with dummy data."""
    print("Creating dummy donation history...")
    
    completed_matches = Match.query.filter_by(status='completed').all()
    
    for match in completed_matches:
        # Check if donation history already exists
        existing_history = DonationHistory.query.filter_by(
            donor_id=match.donor_id,
            request_id=match.request_id
        ).first()
        
        if not existing_history:
            request = Request.query.get(match.request_id)
            units = random.randint(1, min(3, request.units_required))
            
            history = DonationHistory(
                donor_id=match.donor_id,
                request_id=match.request_id,
                hospital_id=request.hospital_id,
                units=units,
                donation_date=match.completed_at or match.confirmed_at or match.matched_at
            )
            db.session.add(history)
    
    db.session.commit()
    print("✓ Created donation history records")

def populate_refresh_tokens():
    """Populate refresh tokens table with dummy data."""
    print("Creating dummy refresh tokens...")
    
    users = User.query.filter(User.role.in_(['admin', 'donor', 'staff'])).all()
    
    for user in users:
        # Create 1-3 refresh tokens per user
        num_tokens = random.randint(1, 3)
        
        for i in range(num_tokens):
            # Check if token already exists
            existing_token = RefreshToken.query.filter_by(user_id=user.id).first()
            
            if not existing_token:
                token = RefreshToken(
                    user_id=user.id,
                    token=f"dummy_refresh_token_{user.id}_{i}_{random.randint(1000, 9999)}",
                    expires_at=datetime.utcnow() + timedelta(days=30),
                    revoked=random.choice([False, False, False, True]),  # 25% revoked
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    revoked_at=datetime.utcnow() - timedelta(days=random.randint(1, 15)) if random.choice([False, False, False, True]) else None
                )
                db.session.add(token)
    
    db.session.commit()
    print("✓ Created refresh tokens")

def populate_otp_sessions():
    """Populate OTP sessions table with dummy data."""
    print("Creating dummy OTP sessions...")
    
    users = User.query.filter(User.role.in_(['donor', 'staff'])).all()
    
    for user in users:
        # Create 1-2 OTP sessions per user
        num_sessions = random.randint(1, 2)
        
        for i in range(num_sessions):
            channel = random.choice(['phone', 'email'])
            destination = user.phone if channel == 'phone' else user.email
            
            if destination:
                otp_session = OTPSession(
                    user_id=user.id,
                    channel=channel,
                    destination=destination,
                    otp_hash=f"dummy_otp_hash_{user.id}_{i}_{random.randint(1000, 9999)}",
                    attempts_left=random.randint(0, 3),
                    expires_at=datetime.utcnow() + timedelta(minutes=15),
                    used=random.choice([False, False, True]),  # 33% used
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
                )
                db.session.add(otp_session)
    
    db.session.commit()
    print("✓ Created OTP sessions")

def clear_existing_data():
    """Clear existing dummy data to avoid conflicts."""
    print("🧹 Clearing existing dummy data...")
    
    try:
        # Delete in reverse order of dependencies
        OTPSession.query.delete()
        RefreshToken.query.delete()
        DonationHistory.query.delete()
        Match.query.delete()
        Request.query.delete()
        HospitalStaff.query.delete()
        Donor.query.delete()
        
        # Keep admin user, delete other users
        User.query.filter(User.role != 'admin').delete()
        
        # Keep verified hospitals, delete others
        Hospital.query.filter(Hospital.is_verified == False).delete()
        
        db.session.commit()
        print("✓ Existing dummy data cleared")
    except Exception as e:
        print(f"⚠️ Warning: Could not clear existing data: {e}")
        db.session.rollback()

def main():
    """Main function to populate all tables with dummy data."""
    print("🚀 Starting SmartBlood Database Population with Dummy Data")
    print("=" * 60)
    
    app = create_app_context()
    
    with app.app_context():
        try:
            # Check if database tables exist
            db.create_all()
            print("✓ Database tables created/verified")
            
            # Clear existing dummy data
            clear_existing_data()
            
            # Populate tables in order (respecting foreign key constraints)
            populate_users()
            populate_donors()
            populate_hospitals()
            populate_hospital_staff()
            populate_blood_requests()
            populate_matches()
            populate_donation_history()
            populate_refresh_tokens()
            populate_otp_sessions()
            
            print("\n" + "=" * 60)
            print("✅ SUCCESS: All tables populated with dummy data!")
            print("=" * 60)
            
            # Print summary
            print("\n📊 Database Summary:")
            print(f"   👥 Users: {User.query.count()}")
            print(f"   🩸 Donors: {Donor.query.count()}")
            print(f"   🏥 Hospitals: {Hospital.query.count()}")
            print(f"   👨‍⚕️ Hospital Staff: {HospitalStaff.query.count()}")
            print(f"   🆘 Blood Requests: {Request.query.count()}")
            print(f"   🤝 Matches: {Match.query.count()}")
            print(f"   📋 Donation History: {DonationHistory.query.count()}")
            print(f"   🔑 Refresh Tokens: {RefreshToken.query.count()}")
            print(f"   📱 OTP Sessions: {OTPSession.query.count()}")
            
            print("\n🎉 Database is now ready with realistic dummy data!")
            print("   Admin Login: admin@smartblood.com / admin123")
            print("   All other users: password123")
            
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    main()
