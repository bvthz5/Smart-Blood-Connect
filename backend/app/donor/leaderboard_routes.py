"""
Leaderboard routes for donor rankings
State-wise and district-wise leaderboards based on badges and donations
"""

from flask import Blueprint, jsonify, request
from app.models import Donor, User, DonationHistory, db
from sqlalchemy import func, desc
from datetime import datetime

leaderboard_bp = Blueprint("leaderboard", __name__, url_prefix="/api/leaderboard")

# Kerala districts for filtering
KERALA_DISTRICTS = [
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
    "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram",
    "Kozhikode", "Wayanad", "Kannur", "Kasaragod"
]

def calculate_badge_score(total_donations):
    """Calculate badge score based on donations"""
    score = 0
    if total_donations >= 1:
        score += 10  # First Drop
    if total_donations >= 5:
        score += 25  # Life Saver
    if total_donations >= 10:
        score += 50  # Blood Hero
    if total_donations >= 25:
        score += 100  # Champion Donor
    if total_donations >= 50:
        score += 200  # Legend
    if total_donations >= 100:
        score += 500  # Century Donor
    return score


def get_donor_badges(total_donations):
    """Get list of earned badges"""
    badges = []
    badge_definitions = [
        {"id": 1, "name": "First Drop", "icon": "🩸", "requirement": 1},
        {"id": 2, "name": "Life Saver", "icon": "💉", "requirement": 5},
        {"id": 3, "name": "Blood Hero", "icon": "🦸", "requirement": 10},
        {"id": 4, "name": "Champion Donor", "icon": "🏆", "requirement": 25},
        {"id": 5, "name": "Legend", "icon": "⭐", "requirement": 50},
        {"id": 6, "name": "Century Donor", "icon": "💯", "requirement": 100},
    ]
    
    for badge_def in badge_definitions:
        if total_donations >= badge_def["requirement"]:
            badges.append({
                "name": badge_def["name"],
                "icon": badge_def["icon"]
            })
    
    return badges


@leaderboard_bp.route("/kerala", methods=["GET"])
def get_kerala_leaderboard():
    """Get state-wide leaderboard for Kerala"""
    try:
        limit = request.args.get("limit", 100, type=int)
        limit = min(limit, 500)  # Max 500 entries

        # Query donors with donation counts
        leaderboard_query = db.session.query(
            Donor.id.label('donor_id'),
            User.first_name,
            User.last_name,
            Donor.blood_group,
            Donor.city,
            Donor.district,
            func.count(DonationHistory.id).label('total_donations'),
            func.max(DonationHistory.donation_date).label('last_donation')
        ).join(
            User, Donor.user_id == User.id
        ).outerjoin(
            DonationHistory, Donor.id == DonationHistory.donor_id
        ).filter(
            User.status == 'active'
        ).group_by(
            Donor.id, User.first_name, User.last_name,
            Donor.blood_group, Donor.city, Donor.district
        )

        results = leaderboard_query.all()

        # Sort by badge score and donations in Python
        leaderboard = []
        for result in results:
            total_donations = result.total_donations or 0
            badge_score = calculate_badge_score(total_donations)
            badges = get_donor_badges(total_donations)

            leaderboard.append({
                "donor_id": result.donor_id,
                "name": f"{result.first_name} {result.last_name or ''}".strip(),
                "blood_group": result.blood_group,
                "city": result.city,
                "district": result.district,
                "total_donations": total_donations,
                "badge_score": badge_score,
                "badges": badges,
                "last_donation": result.last_donation.isoformat() if result.last_donation else None
            })

        # Sort by badge_score DESC, then total_donations DESC
        leaderboard.sort(key=lambda x: (x['badge_score'], x['total_donations']), reverse=True)

        # Limit results and add rank
        leaderboard = leaderboard[:limit]
        for rank, item in enumerate(leaderboard, start=1):
            item['rank'] = rank

        return jsonify({
            "state": "Kerala",
            "total_donors": len(leaderboard),
            "leaderboard": leaderboard
        })
    except Exception as e:
        print(f"Error in get_kerala_leaderboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@leaderboard_bp.route("/district/<district_name>", methods=["GET"])
def get_district_leaderboard(district_name):
    """Get district-wise leaderboard"""
    try:
        limit = request.args.get("limit", 50, type=int)
        limit = min(limit, 200)  # Max 200 entries per district

        # Validate district name
        if district_name not in KERALA_DISTRICTS:
            return jsonify({"error": "Invalid district name"}), 400

        # Query donors from specific district
        leaderboard_query = db.session.query(
            Donor.id.label('donor_id'),
            User.first_name,
            User.last_name,
            Donor.blood_group,
            Donor.city,
            func.count(DonationHistory.id).label('total_donations'),
            func.max(DonationHistory.donation_date).label('last_donation')
        ).join(
            User, Donor.user_id == User.id
        ).outerjoin(
            DonationHistory, Donor.id == DonationHistory.donor_id
        ).filter(
            User.status == 'active',
            Donor.district == district_name
        ).group_by(
            Donor.id, User.first_name, User.last_name,
            Donor.blood_group, Donor.city
        )

        results = leaderboard_query.all()

        leaderboard = []
        for result in results:
            total_donations = result.total_donations or 0
            badge_score = calculate_badge_score(total_donations)
            badges = get_donor_badges(total_donations)

            leaderboard.append({
                "donor_id": result.donor_id,
                "name": f"{result.first_name} {result.last_name or ''}".strip(),
                "blood_group": result.blood_group,
                "city": result.city,
                "total_donations": total_donations,
                "badge_score": badge_score,
                "badges": badges,
                "last_donation": result.last_donation.isoformat() if result.last_donation else None
            })

        # Sort by badge_score DESC, then total_donations DESC
        leaderboard.sort(key=lambda x: (x['badge_score'], x['total_donations']), reverse=True)

        # Limit results and add rank
        leaderboard = leaderboard[:limit]
        for rank, item in enumerate(leaderboard, start=1):
            item['rank'] = rank

        return jsonify({
            "district": district_name,
            "total_donors": len(leaderboard),
            "leaderboard": leaderboard
        })
    except Exception as e:
        print(f"Error in get_district_leaderboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@leaderboard_bp.route("/top-donors", methods=["GET"])
def get_top_donors():
    """Get top 10 donors across Kerala"""
    try:
        leaderboard_query = db.session.query(
            Donor.id.label('donor_id'),
            User.first_name,
            User.last_name,
            Donor.blood_group,
            Donor.city,
            Donor.district,
            func.count(DonationHistory.id).label('total_donations')
        ).join(
            User, Donor.user_id == User.id
        ).outerjoin(
            DonationHistory, Donor.id == DonationHistory.donor_id
        ).filter(
            User.status == 'active'
        ).group_by(
            Donor.id, User.first_name, User.last_name,
            Donor.blood_group, Donor.city, Donor.district
        )

        results = leaderboard_query.all()

        # Build list with badge scores
        top_donors_list = []
        for result in results:
            total_donations = result.total_donations or 0
            badge_score = calculate_badge_score(total_donations)
            badges = get_donor_badges(total_donations)

            top_donors_list.append({
                "name": f"{result.first_name} {result.last_name or ''}".strip(),
                "blood_group": result.blood_group,
                "location": f"{result.city}, {result.district}" if result.city and result.district else result.district or result.city or "Kerala",
                "total_donations": total_donations,
                "badge_score": badge_score,
                "badges": badges,
                "highest_badge": badges[-1] if badges else None
            })

        # Sort by badge_score DESC, then total_donations DESC
        top_donors_list.sort(key=lambda x: (x['badge_score'], x['total_donations']), reverse=True)

        # Take top 10 and add rank
        top_donors = top_donors_list[:10]
        for rank, donor in enumerate(top_donors, start=1):
            donor['rank'] = rank
            # Remove badge_score from response (internal use only)
            donor.pop('badge_score', None)

        return jsonify({
            "top_donors": top_donors
        })
    except Exception as e:
        print(f"Error in get_top_donors: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@leaderboard_bp.route("/districts", methods=["GET"])
def get_districts():
    """Get list of all Kerala districts"""
    return jsonify({
        "districts": KERALA_DISTRICTS
    })


@leaderboard_bp.route("/stats", methods=["GET"])
def get_leaderboard_stats():
    """Get overall leaderboard statistics"""
    try:
        # Total active donors
        total_donors = db.session.query(func.count(Donor.id)).join(
            User, Donor.user_id == User.id
        ).filter(User.status == 'active').scalar()

        # Total donations
        total_donations = db.session.query(func.count(DonationHistory.id)).scalar()

        # Donors by district
        district_stats = db.session.query(
            Donor.district,
            func.count(Donor.id).label('donor_count')
        ).join(
            User, Donor.user_id == User.id
        ).filter(
            User.status == 'active',
            Donor.district.isnot(None)
        ).group_by(
            Donor.district
        ).all()

        district_data = [
            {"district": stat.district, "donors": stat.donor_count}
            for stat in district_stats
        ]

        return jsonify({
            "total_donors": total_donors or 0,
            "total_donations": total_donations or 0,
            "districts": district_data
        })
    except Exception as e:
        print(f"Error in get_leaderboard_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

