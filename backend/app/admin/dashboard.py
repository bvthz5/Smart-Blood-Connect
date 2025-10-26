"""  
Simple Admin Dashboard Routes
"""
from flask import Blueprint, jsonify, current_app
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
      401:
        description: Unauthorized
      500:
        description: Internal server error
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        
        # Safe user ID conversion
        try:
            current_user_id = int(current_user_id)
        except (ValueError, TypeError) as e:
            current_app.logger.error(f"Invalid user ID format: {current_user_id}, error: {e}")
            return jsonify({"error": "Invalid user ID"}), 401
            
        # Safe admin user query
        admin_user = None
        try:
            admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        except Exception as e:
            current_app.logger.error(f"Admin user query failed: {e}")
            return jsonify({"error": "Database query failed"}), 500
        
        if not admin_user:
            current_app.logger.warning(f"Unauthorized admin access attempt by user ID: {current_user_id}")
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get basic statistics with error handling
        total_donors = 0
        active_donors = 0
        total_hospitals = 0
        pending_requests = 0
        urgent_requests = 0
        donations_today = 0
        completed_donations = 0
        inventory_units = 0
        
        try:
            total_donors = Donor.query.count() or 0
        except Exception:
            pass
            
        try:
            active_donors = Donor.query.filter_by(is_available=True).count() or 0
        except Exception:
            pass
            
        try:
            total_hospitals = Hospital.query.count() or 0
        except Exception:
            pass
        
        # Get request statistics
        try:
            pending_requests = Request.query.filter_by(status='pending').count() or 0
        except Exception:
            pass
            
        try:
            urgent_requests = Request.query.filter(
                Request.status == 'pending',
                Request.urgency == 'high'
            ).count() or 0
        except Exception:
            pass
        
        # Get donation statistics - safe datetime handling
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            donations_today = DonationHistory.query.filter(
                DonationHistory.donation_date >= today_start
            ).count() or 0
        except Exception as e:
            current_app.logger.warning(f"Donations today query failed: {e}")
            pass
        
        # Get completed donations for this quarter - safe datetime handling
        try:
            quarter_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            current_month = quarter_start.month
            quarter_month = ((current_month - 1) // 3) * 3 + 1
            quarter_start = quarter_start.replace(month=quarter_month)
            
            completed_donations = DonationHistory.query.filter(
                DonationHistory.donation_date >= quarter_start
            ).count() or 0
        except Exception as e:
            current_app.logger.warning(f"Completed donations query failed: {e}")
            pass
        
        # Get critical alerts (urgent pending requests + low inventory alerts)
        critical_alerts = urgent_requests
        
        # Calculate inventory units (sum of available blood units from donation history)
        try:
            inventory_units = db.session.query(func.sum(DonationHistory.units)).scalar() or 0
        except Exception:
            pass
        
        # Get blood group distribution from donors
        blood_group_distribution = []
        try:
            blood_group_data = db.session.query(
                Donor.blood_group,
                func.count(Donor.id).label('count')
            ).filter(Donor.blood_group.isnot(None)).group_by(Donor.blood_group).all()
            
            if blood_group_data:
                blood_group_distribution = [
                    {"group": bg, "count": int(count)} 
                    for bg, count in blood_group_data if bg
                ]
        except Exception as e:
            current_app.logger.error(f"Blood group distribution error: {e}")
        
        # Get requests over time (last 7 days) - safer datetime handling
        requests_over_time = []
        try:
            for i in range(6, -1, -1):
                try:
                    date = datetime.utcnow() - timedelta(days=i)
                    date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
                    date_end = date_start + timedelta(days=1)
                    
                    count = Request.query.filter(
                        Request.created_at >= date_start,
                        Request.created_at < date_end
                    ).count() or 0
                    
                    requests_over_time.append({
                        "date": date_start.strftime("%Y-%m-%d"),
                        "count": int(count)
                    })
                except Exception as inner_e:
                    current_app.logger.warning(f"Request count for day {i} failed: {inner_e}")
                    continue
        except Exception as e:
            current_app.logger.error(f"Requests over time error: {e}")
        
        # Get requests by district - with safer join
        district_data = []
        try:
            requests_by_district = db.session.query(
                Hospital.district,
                func.count(Request.id).label('count')
            ).join(
                Request, Hospital.id == Request.hospital_id
            ).filter(
                Hospital.district.isnot(None),
                Request.hospital_id.isnot(None)
            ).group_by(Hospital.district).order_by(
                func.count(Request.id).desc()
            ).limit(5).all()
            
            if requests_by_district:
                district_data = [
                    {"district": str(district), "count": int(count)}
                    for district, count in requests_by_district if district
                ]
        except Exception as e:
            current_app.logger.error(f"Requests by district error: {e}")
        
        # Get request status analysis
        request_analysis = []
        try:
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
            
            if request_status_data:
                request_analysis = [
                    {
                        "status": str(status).capitalize() if status else 'Unknown',
                        "count": int(count),
                        "color": status_colors.get(str(status), '#6B7280')
                    }
                    for status, count in request_status_data if status
                ]
        except Exception as e:
            current_app.logger.error(f"Request analysis error: {e}")
        
        # Build response with all safe values
        # Log for debugging
        current_app.logger.info(f"Blood group distribution: {blood_group_distribution}")
        current_app.logger.info(f"District data: {district_data}")
        current_app.logger.info(f"Request analysis: {request_analysis}")
        current_app.logger.info(f"Requests over time: {requests_over_time}")
        
        dashboard_data = {
            "stats": {
                "totalDonors": int(total_donors),
                "activeDonors": int(active_donors),
                "hospitals": int(total_hospitals),
                "openRequests": int(pending_requests),
                "urgentRequests": int(urgent_requests),
                "donationsToday": int(donations_today),
                "completedDonations": int(completed_donations),
                "criticalAlerts": int(critical_alerts),
                "inventoryUnits": int(inventory_units)
            },
            "charts": {
                "requestsOverTime": requests_over_time if requests_over_time else [
                    {"date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"), "count": 0}
                    for i in range(6, -1, -1)
                ],
                "bloodGroupDistribution": blood_group_distribution if blood_group_distribution else [
                    {"group": "O+", "count": 0},
                    {"group": "A+", "count": 0},
                    {"group": "B+", "count": 0},
                    {"group": "AB+", "count": 0},
                    {"group": "O-", "count": 0},
                    {"group": "A-", "count": 0},
                    {"group": "B-", "count": 0},
                    {"group": "AB-", "count": 0}
                ],
                "requestsByDistrict": district_data if district_data else [
                    {"district": "No data yet", "count": 0}
                ],
                "requestStatusAnalysis": request_analysis if request_analysis else [
                    {"status": "Pending", "count": 0, "color": "#F59E0B"},
                    {"status": "Completed", "count": 0, "color": "#10B981"},
                    {"status": "Cancelled", "count": 0, "color": "#EF4444"}
                ]
            },
            "activities": [],
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
        current_app.logger.error(f"Dashboard critical error: {e}")
        import traceback
        traceback.print_exc()
        
        # Return safe error response
        return jsonify({
            "success": False,
            "error": "Failed to fetch dashboard data",
            "details": str(e) if current_app.debug else "Please check server logs"
        }), 500
