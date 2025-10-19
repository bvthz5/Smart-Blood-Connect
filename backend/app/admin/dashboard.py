"""
Simple Admin Dashboard Routes
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Donor, Hospital, Request, DonationHistory
from app.extensions import db
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta

admin_dashboard_bp = Blueprint("admin_dashboard", __name__, url_prefix="/api/admin/dashboard")

@admin_dashboard_bp.route("/", methods=["GET"])
@jwt_required()
def get_dashboard_data():
    """
    Simple Admin Dashboard Data
    ---
    tags:
      - Admin
    summary: Get basic dashboard statistics
    description: Retrieve basic dashboard data for the admin panel
    security:
      - Bearer: []
    produces:
      - application/json
    responses:
      200:
        description: Dashboard data retrieved successfully
        schema:
          type: object
          properties:
            stats:
              type: object
              properties:
                totalDonors:
                  type: integer
                  example: 12458
                activeDonors:
                  type: integer
                  example: 8732
                totalHospitals:
                  type: integer
                  example: 25
                openRequests:
                  type: integer
                  example: 45
                urgentRequests:
                  type: integer
                  example: 12
                donationsToday:
                  type: integer
                  example: 15
            charts:
              type: object
              properties:
                requestsOverTime:
                  type: array
                  items:
                    type: object
                    properties:
                      date:
                        type: string
                        example: "2024-01-01"
                      count:
                        type: integer
                        example: 5
                bloodGroupDistribution:
                  type: array
                  items:
                    type: object
                    properties:
                      group:
                        type: string
                        example: "A+"
                      count:
                        type: integer
                        example: 150
                requestsByDistrict:
                  type: array
                  items:
                    type: object
                    properties:
                      district:
                        type: string
                        example: "Ernakulam"
                      count:
                        type: integer
                        example: 25
            recentEmergencies:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                    example: 1
                  hospital:
                    type: string
                    example: "General Hospital"
                  bloodGroup:
                    type: string
                    example: "O+"
                  time:
                    type: string
                    example: "2 hours ago"
            topHospitals:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                    example: 1
                  name:
                    type: string
                    example: "General Hospital"
                  location:
                    type: string
                    example: "Ernakulam"
                  requests:
                    type: integer
                    example: 45
            topDonors:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                    example: 1
                  name:
                    type: string
                    example: "John Doe"
                  bloodGroup:
                    type: string
                    example: "O+"
                  donations:
                    type: integer
                    example: 5
      401:
        description: Unauthorized
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Unauthorized"
      500:
        description: Internal server error
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Failed to fetch dashboard data"
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get basic statistics
        total_donors = Donor.query.count()
        active_donors = Donor.query.filter_by(is_available=True).count()
        total_hospitals = Hospital.query.count()
        
        # Get request statistics
        pending_requests = Request.query.filter_by(status='pending').count()
        urgent_requests = Request.query.filter(
            Request.status == 'pending',
            Request.urgency == 'high'
        ).count()
        
        # Get donation statistics
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        donations_today = DonationHistory.query.filter(
            DonationHistory.donation_date >= today_start
        ).count()
        
        # Get completed donations for this quarter
        quarter_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Calculate quarter start (Jan 1, Apr 1, Jul 1, Oct 1)
        current_month = quarter_start.month
        quarter_month = ((current_month - 1) // 3) * 3 + 1
        quarter_start = quarter_start.replace(month=quarter_month)
        
        completed_donations = DonationHistory.query.filter(
            DonationHistory.donation_date >= quarter_start
        ).count()
        
        # Get critical alerts (urgent pending requests + low inventory alerts)
        critical_alerts = urgent_requests
        
        # Calculate inventory units (sum of available blood units from donation history)
        # This is a simplified calculation - you may need to adjust based on your business logic
        inventory_units = db.session.query(func.sum(DonationHistory.units)).scalar() or 0
        
        # Get blood group distribution from donors
        blood_group_data = db.session.query(
            Donor.blood_group,
            func.count(Donor.id).label('count')
        ).group_by(Donor.blood_group).all()
        
        blood_group_distribution = [
            {"group": bg, "count": count} 
            for bg, count in blood_group_data
        ] if blood_group_data else []
        
        # Get requests over time (last 7 days)
        requests_over_time = []
        for i in range(6, -1, -1):
            date = datetime.utcnow() - timedelta(days=i)
            date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            date_end = date_start + timedelta(days=1)
            
            count = Request.query.filter(
                Request.created_at >= date_start,
                Request.created_at < date_end
            ).count()
            
            requests_over_time.append({
                "date": date_start.strftime("%Y-%m-%d"),
                "count": count
            })
        
        # Get requests by district
        requests_by_district = db.session.query(
            Hospital.district,
            func.count(Request.id).label('count')
        ).join(Request, Hospital.id == Request.hospital_id).filter(
            Hospital.district.isnot(None)
        ).group_by(Hospital.district).order_by(func.count(Request.id).desc()).limit(5).all()
        
        district_data = [
            {"district": district, "count": count}
            for district, count in requests_by_district
        ] if requests_by_district else []
        
        # Get request status analysis
        request_status_data = db.session.query(
            Request.status,
            func.count(Request.id).label('count')
        ).group_by(Request.status).all()
        
        # Define colors for each status
        status_colors = {
            'completed': '#10B981',
            'pending': '#F59E0B',
            'cancelled': '#EF4444',
            'in_progress': '#3B82F6',
            'rejected': '#6B7280'
        }
        
        request_analysis = [
            {
                "status": status.capitalize(),
                "count": count,
                "color": status_colors.get(status, '#6B7280')
            }
            for status, count in request_status_data
        ] if request_status_data else []
        
        dashboard_data = {
            "stats": {
                "totalDonors": total_donors,
                "activeDonors": active_donors,
                "hospitals": total_hospitals,
                "openRequests": pending_requests,
                "urgentRequests": urgent_requests,
                "donationsToday": donations_today,
                "completedDonations": completed_donations,
                "criticalAlerts": critical_alerts,
                "inventoryUnits": inventory_units
            },
            "charts": {
                "requestsOverTime": requests_over_time,
                "bloodGroupDistribution": blood_group_distribution,
                "requestsByDistrict": district_data,
                "requestStatusAnalysis": request_analysis
            },
            "recentEmergencies": [
                {
                    "id": 1,
                    "hospital": "General Hospital",
                    "bloodGroup": "O+",
                    "time": "2 hours ago"
                },
                {
                    "id": 2,
                    "hospital": "Medical College",
                    "bloodGroup": "A+",
                    "time": "4 hours ago"
                },
                {
                    "id": 3,
                    "hospital": "City Hospital",
                    "bloodGroup": "B+",
                    "time": "6 hours ago"
                }
            ],
            "topHospitals": [
                {
                    "id": 1,
                    "name": "General Hospital",
                    "location": "Ernakulam",
                    "requests": 45
                },
                {
                    "id": 2,
                    "name": "Medical College",
                    "location": "Thiruvananthapuram",
                    "requests": 38
                },
                {
                    "id": 3,
                    "name": "City Hospital",
                    "location": "Kozhikode",
                    "requests": 32
                }
            ],
            "topDonors": [
                {
                    "id": 1,
                    "name": "John Doe",
                    "bloodGroup": "O+",
                    "donations": 5
                },
                {
                    "id": 2,
                    "name": "Jane Smith",
                    "bloodGroup": "A+",
                    "donations": 4
                },
                {
                    "id": 3,
                    "name": "Mike Johnson",
                    "bloodGroup": "B+",
                    "donations": 3
                }
            ]
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        return jsonify({"error": "Failed to fetch dashboard data"}), 500
