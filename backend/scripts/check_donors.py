import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models import Donor, User

app = create_app()

with app.app_context():
    # Check all AB+ donors
    ab_plus_donors = Donor.query.filter_by(blood_group='AB+', is_available=True).all()
    print(f"Total AB+ donors: {len(ab_plus_donors)}")
    
    # Check AB+ donors in Thiruvananthapuram
    tvm_ab_plus = []
    for donor in ab_plus_donors:
        if hasattr(donor.user, 'district') and donor.user.district == 'Thiruvananthapuram':
            tvm_ab_plus.append(donor)
    
    print(f"AB+ donors in Thiruvananthapuram: {len(tvm_ab_plus)}")
    
    # Check if any donors have location data
    donors_with_location = []
    for donor in ab_plus_donors:
        if donor.location_lat and donor.location_lng:
            donors_with_location.append(donor)
    
    print(f"AB+ donors with location data: {len(donors_with_location)}")
    
    # Show sample donors
    print("\nSample AB+ donors:")
    for i, donor in enumerate(ab_plus_donors[:5]):
        print(f"  {i+1}. {donor.user.first_name} {donor.user.last_name}")
        print(f"     District: {getattr(donor.user, 'district', 'N/A')}")
        print(f"     Location: {donor.location_lat}, {donor.location_lng}")
        print(f"     Last donation: {donor.last_donation_date}")