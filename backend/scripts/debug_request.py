import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models import User, Request

app = create_app()

with app.app_context():
    # Check seeker info
    seeker = User.query.get(3)
    if seeker:
        print("Seeker Info:")
        print(f"  Name: {seeker.first_name} {seeker.last_name}")
        print(f"  Email: {seeker.email}")
        print(f"  Role: {seeker.role}")
        print(f"  City: {getattr(seeker, 'city', 'N/A')}")
        print(f"  District: {getattr(seeker, 'district', 'N/A')}")
        print(f"  State: {getattr(seeker, 'state', 'N/A')}")
    else:
        print("Seeker not found!")
    
    # Check request info
    request = Request.query.get(21)
    if request:
        print("\nRequest Info:")
        print(f"  ID: {request.id}")
        print(f"  Blood Group: {request.blood_group}")
        print(f"  Hospital ID: {request.hospital_id}")
        print(f"  Seeker ID: {request.seeker_id}")
    else:
        print("Request not found!")