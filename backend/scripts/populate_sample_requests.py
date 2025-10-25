#!/usr/bin/env python3
"""
Populate database with sample blood requests for testing
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import Flask app and models
from app import create_app
from app.models import db, Request, Hospital, User, Donor
from app.extensions import db as db_ext

def create_sample_data():
    """Create sample blood requests and hospitals"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create sample hospitals if they don't exist
            hospitals_data = [
                {
                    'name': 'Medical Trust Hospital',
                    'email': 'medicaltrust@hospital.com',
                    'phone': '0484-1234567',
                    'address': 'MG Road, Kochi',
                    'district': 'Ernakulam',
                    'city': 'Kochi',
                    'state': 'Kerala',
                    'pincode': '682016',
                    'license_number': 'LIC001',
                    'is_verified': True,
                    'is_active': True
                },
                {
                    'name': 'Amrita Institute of Medical Sciences',
                    'email': 'aims@amrita.edu',
                    'phone': '0484-2851234',
                    'address': 'Ponekkara, Kochi',
                    'district': 'Ernakulam',
                    'city': 'Kochi',
                    'state': 'Kerala',
                    'pincode': '682041',
                    'license_number': 'LIC002',
                    'is_verified': True,
                    'is_active': True
                },
                {
                    'name': 'Lakeshore Hospital',
                    'email': 'info@lakeshorehospital.com',
                    'phone': '0484-2701234',
                    'address': 'NH Bypass, Kochi',
                    'district': 'Ernakulam',
                    'city': 'Kochi',
                    'state': 'Kerala',
                    'pincode': '682040',
                    'license_number': 'LIC003',
                    'is_verified': True,
                    'is_active': True
                },
                {
                    'name': 'Rajagiri Hospital',
                    'email': 'info@rajagirihospital.com',
                    'phone': '0484-2661234',
                    'address': 'Chunangamveli, Kochi',
                    'district': 'Ernakulam',
                    'city': 'Kochi',
                    'state': 'Kerala',
                    'pincode': '682312',
                    'license_number': 'LIC004',
                    'is_verified': True,
                    'is_active': True
                }
            ]
            
            hospitals = []
            for hosp_data in hospitals_data:
                existing = Hospital.query.filter_by(email=hosp_data['email']).first()
                if not existing:
                    hospital = Hospital(**hosp_data)
                    db.session.add(hospital)
                    hospitals.append(hospital)
                else:
                    hospitals.append(existing)
            
            db.session.commit()
            
            # Create sample blood requests
            blood_groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
            urgencies = ['high', 'medium', 'low']
            
            sample_requests = []
            for i in range(10):
                hospital = hospitals[i % len(hospitals)]
                blood_group = blood_groups[i % len(blood_groups)]
                urgency = urgencies[i % len(urgencies)]
                
                request_data = {
                    'hospital_id': hospital.id,
                    'patient_name': f'Patient {i+1}',
                    'blood_group': blood_group,
                    'units_required': (i % 3) + 1,
                    'urgency': urgency,
                    'status': 'pending',
                    'description': f'Emergency blood requirement for {blood_group} blood group',
                    'contact_person': f'Dr. Smith {i+1}',
                    'contact_phone': f'987654321{i}',
                    'required_by': datetime.utcnow() + timedelta(days=(i % 7) + 1),
                    'created_at': datetime.utcnow() - timedelta(hours=i)
                }
                
                existing_request = Request.query.filter_by(
                    hospital_id=hospital.id,
                    patient_name=request_data['patient_name']
                ).first()
                
                if not existing_request:
                    blood_request = Request(**request_data)
                    db.session.add(blood_request)
                    sample_requests.append(blood_request)
            
            db.session.commit()
            
            print(f"[OK] Created {len(hospitals)} hospitals")
            print(f"[OK] Created {len(sample_requests)} blood requests")
            print("Sample data created successfully!")
            
        except Exception as e:
            print(f"[ERROR] Error creating sample data: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    create_sample_data()
