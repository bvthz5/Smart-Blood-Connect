#!/usr/bin/env python
"""
Script to list all matches in the database
"""
import sys
import os

# Add parent directory to sys.path
PARENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, PARENT_DIR)

from app import create_app
from app.extensions import db
from app.models import Match, MatchPrediction, Donor, Request, Hospital, User
from datetime import datetime


def list_all_matches():
    """List all matches with details"""
    app = create_app()
    
    with app.app_context():
        print("=" * 100)
        print("ALL BLOOD MATCHES (CONFIRMED)")
        print("=" * 100)
        
        # Get all confirmed matches with joins
        matches = db.session.query(Match, Donor, User, Request, Hospital).join(
            Donor, Match.donor_id == Donor.id
        ).join(
            User, Donor.user_id == User.id
        ).join(
            Request, Match.request_id == Request.id
        ).join(
            Hospital, Request.hospital_id == Hospital.id
        ).order_by(Match.matched_at.desc()).all()
        
        if not matches:
            print("\n❌ No matches found in the database")
            print("\nTo create matches, you need to:")
            print("1. Create blood requests via seeker dashboard")
            print("2. System will automatically match donors")
            print("3. Or use admin manual matching")
            return
        
        print(f"\n📊 Total Matches: {len(matches)}\n")
        
        # Group by status
        status_counts = {}
        for match, donor, user, request, hospital in matches:
            status = match.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print("Status Summary:")
        for status, count in sorted(status_counts.items()):
            print(f"  {status.upper()}: {count}")
        
        print("\n" + "=" * 100)
        print("MATCH DETAILS")
        print("=" * 100)
        
        for i, (match, donor, user, request, hospital) in enumerate(matches, 1):
            print(f"\n{i}. Match #{match.id}")
            print("-" * 100)
            
            # Donor Info
            print(f"   👤 DONOR:")
            print(f"      Name: {user.first_name} {user.last_name}")
            print(f"      Blood Group: {donor.blood_group}")
            print(f"      Phone: {user.phone}")
            print(f"      Email: {user.email}")
            print(f"      District: {user.district}")
            print(f"      Status: {user.status}, Verified: {user.is_email_verified}")
            
            # Request Info
            print(f"\n   🩸 REQUEST:")
            print(f"      Request ID: #{request.id}")
            print(f"      Patient: {request.patient_name}")
            print(f"      Blood Group Needed: {request.blood_group}")
            print(f"      Units Required: {request.units_required}")
            print(f"      Urgency: {request.urgency}")
            print(f"      Request Status: {request.status}")
            
            # Hospital Info
            print(f"\n   🏥 HOSPITAL:")
            print(f"      Name: {hospital.name}")
            print(f"      City: {hospital.city}")
            print(f"      District: {hospital.district}")
            
            # Match Info
            print(f"\n   🎯 MATCH INFO:")
            print(f"      Status: {match.status}")
            print(f"      Matched At: {match.matched_at.strftime('%Y-%m-%d %H:%M:%S') if match.matched_at else 'N/A'}")
            
            if match.confirmed_at:
                print(f"      Confirmed At: {match.confirmed_at.strftime('%Y-%m-%d %H:%M:%S')}")
            if match.completed_at:
                print(f"      Completed At: {match.completed_at.strftime('%Y-%m-%d %H:%M:%S')}")
            if match.notes:
                print(f"      Notes: {match.notes}")
            
            # Get match prediction if exists
            prediction = db.session.query(MatchPrediction).filter_by(
                request_id=request.id,
                donor_id=donor.id
            ).first()
            
            if prediction:
                print(f"\n   📊 ML PREDICTION:")
                print(f"      Match Score: {prediction.match_score:.2f}")
                print(f"      Availability Score: {prediction.availability_score:.2f}")
                print(f"      Reliability Score: {prediction.reliability_score:.2f}")
                print(f"      Rank: #{prediction.rank}")
                print(f"      Notified: {'Yes' if prediction.notified else 'No'}")
        
        print("\n" + "=" * 100)
        
        # Now show ML predictions
        print("\n\n")
        print("=" * 100)
        print("ML MATCH PREDICTIONS (All Scored Donor-Request Pairs)")
        print("=" * 100)
        
        predictions = db.session.query(MatchPrediction, Donor, User, Request, Hospital).join(
            Donor, MatchPrediction.donor_id == Donor.id
        ).join(
            User, Donor.user_id == User.id
        ).join(
            Request, MatchPrediction.request_id == Request.id
        ).join(
            Hospital, Request.hospital_id == Hospital.id
        ).order_by(Request.id, MatchPrediction.match_score.desc()).all()
        
        if predictions:
            print(f"\n📊 Total Predictions: {len(predictions)}\n")
            
            # Group by request
            predictions_by_request = {}
            for pred, donor, user, request, hospital in predictions:
                if request.id not in predictions_by_request:
                    predictions_by_request[request.id] = []
                predictions_by_request[request.id].append((pred, donor, user, request, hospital))
            
            print("Predictions by Request:")
            for req_id, preds in predictions_by_request.items():
                print(f"  Request #{req_id}: {len(preds)} donors scored")
            
            print("\n" + "=" * 100)
            print("PREDICTION DETAILS")
            print("=" * 100)
            
            for req_id, preds in sorted(predictions_by_request.items()):
                print(f"\n🩸 REQUEST #{req_id}")
                _, _, _, request, hospital = preds[0]
                print(f"   Patient: {request.patient_name}")
                print(f"   Blood Group: {request.blood_group}")
                print(f"   Units: {request.units_required}")
                print(f"   Urgency: {request.urgency}")
                print(f"   Hospital: {hospital.name}, {hospital.city}")
                print(f"\n   Top {min(len(preds), 5)} Donor Matches:")
                
                for i, (pred, donor, user, _, _) in enumerate(preds[:5], 1):
                    print(f"\n   {i}. {user.first_name} {user.last_name} ({donor.blood_group})")
                    print(f"      Match Score: {pred.match_score:.2f} | Availability: {pred.availability_score:.2f} | Reliability: {pred.reliability_score:.2f}")
                    print(f"      Rank: #{pred.rank} | Notified: {'✅' if pred.notified else '❌'} | District: {user.district}")
                
                print(f"\n   ... and {len(preds) - 5} more donors" if len(preds) > 5 else "")
        else:
            print("\n❌ No predictions found")
        
        print("\n" + "=" * 100)
        
        # Additional statistics
        print("\n📈 STATISTICS:")
        print("-" * 100)
        
        # Blood group distribution
        blood_groups = {}
        for match, donor, user, request, hospital in matches:
            bg = request.blood_group
            blood_groups[bg] = blood_groups.get(bg, 0) + 1
        
        print("\nMatches by Blood Group Required:")
        for bg, count in sorted(blood_groups.items()):
            print(f"  {bg}: {count}")
        
        # Urgency distribution
        urgency_counts = {}
        for match, donor, user, request, hospital in matches:
            urgency = request.urgency
            urgency_counts[urgency] = urgency_counts.get(urgency, 0) + 1
        
        print("\nMatches by Urgency:")
        for urgency, count in sorted(urgency_counts.items()):
            print(f"  {urgency.upper()}: {count}")
        
        # Hospital distribution
        hospital_counts = {}
        for match, donor, user, request, hospital in matches:
            hosp_name = hospital.name
            hospital_counts[hosp_name] = hospital_counts.get(hosp_name, 0) + 1
        
        print("\nMatches by Hospital:")
        for hosp, count in sorted(hospital_counts.items()):
            print(f"  {hosp}: {count}")
        
        print("\n" + "=" * 100)


if __name__ == "__main__":
    list_all_matches()
