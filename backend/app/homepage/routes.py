"""
Homepage API routes for SmartBlood Connect
Handles homepage data including statistics, alerts, and dynamic content
"""

from flask import Blueprint, jsonify, request
from app.models import User, Request, Donor, Hospital, Match, DonationHistory
from app import db
from sqlalchemy import func, text
from datetime import datetime, timedelta
import logging

# Create blueprint
homepage_bp = Blueprint('homepage', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@homepage_bp.route('/api/homepage/stats', methods=['GET'])
def get_homepage_stats():
    """
    Get homepage statistics including donors, units, hospitals, and districts
    """
    try:
        # Get donor count (active donors)
        donors_count = db.session.query(func.count(Donor.id)).join(
            User, Donor.user_id == User.id
        ).filter(
            User.status == "active"
        ).scalar() or 0
        
        # Get total units collected (from donation history)
        units_collected = db.session.query(func.sum(DonationHistory.units)).scalar() or 0
        
        # Get active hospitals count
        hospitals_count = db.session.query(func.count(Hospital.id)).filter(
            Hospital.is_active == True
        ).scalar() or 0
        
        # Get districts covered (unique districts from hospitals)
        districts_count = db.session.query(func.count(func.distinct(Hospital.district))).filter(
            Hospital.is_active == True,
            Hospital.district.isnot(None)
        ).scalar() or 0
        
        # Get recent activity stats
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        # Recent donations (last 7 days)
        recent_donations = db.session.query(func.count(DonationHistory.id)).filter(
            DonationHistory.donation_date >= week_ago
        ).scalar() or 0
        
        # Recent requests (last 7 days)
        recent_requests = db.session.query(func.count(Request.id)).filter(
            Request.created_at >= week_ago
        ).scalar() or 0
        
        # Lives saved (estimated from completed donations)
        lives_saved = int(units_collected * 3) if units_collected else 0
        
        stats = {
            'donors_registered': donors_count,
            'units_collected': int(units_collected) if units_collected else 0,
            'active_hospitals': hospitals_count,
            'districts_covered': districts_count,
            'recent_donations': recent_donations,
            'recent_requests': recent_requests,
            'lives_saved': lives_saved,
            'last_updated': datetime.now().isoformat()
        }
        
        logger.info(f"Homepage stats retrieved: {stats}")
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f"Error fetching homepage stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch homepage statistics'
        }), 500

@homepage_bp.route('/api/homepage/alerts', methods=['GET'])
def get_homepage_alerts():
    """
    Get emergency alerts and blood shortage notifications
    """
    try:
        # Get urgent blood requests (high urgency, recent)
        urgent_requests = db.session.query(Request).filter(
            Request.urgency == 'high',
            Request.status == 'pending',
            Request.created_at >= datetime.now() - timedelta(hours=24)
        ).limit(5).all()
        
        alerts = []
        
        # Convert urgent requests to alerts
        for request in urgent_requests:
            alert = {
                'id': request.id,
                'type': 'alert',
                'title': f'Urgent Need: {request.blood_group} in {request.hospital.location if request.hospital else "Unknown Location"}',
                'message': f'({request.units_required} units needed) - Click to Help',
                'blood_type': request.blood_group,
                'location': request.hospital.location if request.hospital else "Unknown Location",
                'quantity': request.units_required,
                'created_at': request.created_at.isoformat(),
                'priority': request.urgency,
                'action_url': f'/seeker/request/{request.id}'
            }
            alerts.append(alert)
        
        # Get upcoming blood camps
        upcoming_camps = db.session.query(Hospital).filter(
            Hospital.next_camp_date.isnot(None),
            Hospital.next_camp_date >= datetime.now().date()
        ).limit(3).all()
        
        for camp in upcoming_camps:
            alert = {
                'id': f'camp_{camp.id}',
                'type': 'camp',
                'title': f'Blood Donation Camp at {camp.name}',
                'message': f'{camp.next_camp_date.strftime("%B %d, %Y")} - {camp.location}',
                'hospital_name': camp.name,
                'location': camp.location or camp.address,
                'date': camp.next_camp_date.isoformat(),
                'created_at': datetime.now().isoformat(),
                'action_url': f'/camps/{camp.id}'
            }
            alerts.append(alert)
        
        # Sort alerts by priority and date
        alerts.sort(key=lambda x: (x.get('priority') == 'urgent', x['created_at']), reverse=True)
        
        logger.info(f"Retrieved {len(alerts)} homepage alerts")
        return jsonify({
            'success': True,
            'data': alerts[:5]  # Return top 5 alerts
        })
        
    except Exception as e:
        logger.error(f"Error fetching homepage alerts: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch alerts'
        }), 500

@homepage_bp.route('/api/homepage/testimonials', methods=['GET'])
def get_homepage_testimonials():
    """
    Get testimonials from donors and recipients
    """
    try:
        # Get recent successful matches for testimonials
        recent_matches = db.session.query(Match).filter(
            Match.status == 'completed',
            Match.matched_at >= datetime.now() - timedelta(days=30)
        ).limit(3).all()
        
        testimonials = []
        
        for match in recent_matches:
            # Get donor and request info
            donor = db.session.query(Donor).filter(Donor.id == match.donor_id).first()
            request = db.session.query(Request).filter(Request.id == match.request_id).first()
            
            if donor and request:
                # Get hospital through request
                hospital = db.session.query(Hospital).filter(Hospital.id == request.hospital_id).first()
                # Get donor's user info
                user = db.session.query(User).filter(User.id == donor.user_id).first()
                
                if user and hospital:
                    testimonial = {
                        'id': match.id,
                        'quote': f"SmartBlood helped me donate blood at {hospital.name} and save lives.",
                        'author': f"{user.first_name} {user.last_name}",
                        'role': 'Blood Donor',
                        'hospital': hospital.name,
                        'created_at': match.matched_at.isoformat()
                    }
                    testimonials.append(testimonial)
        
        # Add some default testimonials if we don't have enough
        default_testimonials = [
            {
                'id': 'default_1',
                'quote': "SmartBlood saved my father's life by connecting us with a donor within hours.",
                'author': "Priya S.",
                'role': "Patient's Family"
            },
            {
                'id': 'default_2',
                'quote': "As a regular donor, this platform makes it so easy to help when needed most.",
                'author': "Rajesh K.",
                'role': "Blood Donor"
            },
            {
                'id': 'default_3',
                'quote': "The real-time matching system has revolutionized our blood bank operations.",
                'author': "Dr. Meera",
                'role': "Hospital Administrator"
            }
        ]
        
        # Combine real and default testimonials
        all_testimonials = testimonials + default_testimonials
        all_testimonials = all_testimonials[:3]  # Return top 3
        
        logger.info(f"Retrieved {len(all_testimonials)} testimonials")
        return jsonify({
            'success': True,
            'data': all_testimonials
        })
        
    except Exception as e:
        logger.error(f"Error fetching testimonials: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch testimonials'
        }), 500

@homepage_bp.route('/api/homepage/blood-availability', methods=['GET'])
def get_blood_availability():
    """
    Get current blood availability across different blood types
    """
    try:
        # Get blood type availability from hospitals
        availability_query = text("""
            SELECT 
                h.blood_type,
                COUNT(*) as available_units,
                COUNT(DISTINCT h.id) as hospitals_count
            FROM hospitals h
            WHERE h.is_active = true 
            AND h.blood_type IS NOT NULL
            GROUP BY h.blood_type
            ORDER BY h.blood_type
        """)
        
        result = db.session.execute(availability_query).fetchall()
        
        blood_availability = {}
        for row in result:
            blood_availability[row.blood_type] = {
                'available_units': row.available_units,
                'hospitals_count': row.hospitals_count,
                'status': 'available' if row.available_units > 0 else 'unavailable'
            }
        
        # Ensure all blood types are represented
        all_blood_types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        for blood_type in all_blood_types:
            if blood_type not in blood_availability:
                blood_availability[blood_type] = {
                    'available_units': 0,
                    'hospitals_count': 0,
                    'status': 'unavailable'
                }
        
        logger.info(f"Retrieved blood availability for {len(blood_availability)} blood types")
        return jsonify({
            'success': True,
            'data': blood_availability
        })
        
    except Exception as e:
        logger.error(f"Error fetching blood availability: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch blood availability'
        }), 500

@homepage_bp.route('/api/homepage/featured-hospitals', methods=['GET'])
def get_featured_hospitals():
    """
    Get featured hospitals for the homepage
    """
    try:
        # Get active hospitals with recent activity
        hospitals = db.session.query(Hospital).filter(
            Hospital.is_active == True,
            Hospital.featured == True
        ).limit(6).all()
        
        featured_hospitals = []
        for hospital in hospitals:
            # Get recent donation count for this hospital
            recent_donations = db.session.query(func.count(DonationHistory.id)).filter(
                DonationHistory.hospital_id == hospital.id,
                DonationHistory.created_at >= datetime.now() - timedelta(days=30)
            ).scalar() or 0
            
            hospital_data = {
                'id': hospital.id,
                'name': hospital.name,
                'location': hospital.location,
                'district': hospital.district,
                'contact_number': hospital.contact_number,
                'email': hospital.email,
                'website': hospital.website,
                'specialties': hospital.specialties,
                'recent_donations': recent_donations,
                'rating': hospital.rating or 4.5,
                'image_url': hospital.image_url
            }
            featured_hospitals.append(hospital_data)
        
        logger.info(f"Retrieved {len(featured_hospitals)} featured hospitals")
        return jsonify({
            'success': True,
            'data': featured_hospitals
        })
        
    except Exception as e:
        logger.error(f"Error fetching featured hospitals: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch featured hospitals'
        }), 500

@homepage_bp.route('/api/homepage/dashboard-summary', methods=['GET'])
def get_dashboard_summary():
    """
    Admin/Homepage dashboard summary with totals, charts, and activities
    """
    try:
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Totals
        total_donors = db.session.query(func.count(Donor.id)).join(
            User, Donor.user_id == User.id
        ).filter(User.status == "active").scalar() or 0

        total_units = db.session.query(func.sum(DonationHistory.units)).scalar() or 0

        total_hospitals = db.session.query(func.count(Hospital.id)).filter(
            Hospital.is_active == True
        ).scalar() or 0

        pending_requests = db.session.query(func.count(Request.id)).filter(
            Request.status == 'pending'
        ).scalar() or 0

        # Donations today and urgent pending requests
        donations_today = db.session.query(func.count(DonationHistory.id)).filter(
            func.date(DonationHistory.donation_date) == today
        ).scalar() or 0

        urgent_pending = db.session.query(func.count(Request.id)).filter(
            Request.status == 'pending',
            Request.urgency == 'high'
        ).scalar() or 0

        totals = {
            'donors': int(total_donors),
            'hospitals': int(total_hospitals),
            'inventory_units': int(total_units) if total_units else 0,
            'pending_requests': int(pending_requests),
        }

        # Blood group distribution (active donors)
        blood_type_rows = db.session.query(
            Donor.blood_group, func.count(Donor.id)
        ).join(User, Donor.user_id == User.id).filter(
            User.status == "active", Donor.blood_group.isnot(None)
        ).group_by(Donor.blood_group).all()

        color_map = {
            'A+': '#FF6B6B', 'B+': '#4ECDC4', 'O+': '#45B7D1', 'AB+': '#96CEB4',
            'A-': '#FECA57', 'B-': '#FF9FF3', 'O-': '#54A0FF', 'AB-': '#5F27CD'
        }
        blood_groups = [
            { 'group': bt, 'count': int(cnt), 'color': color_map.get(bt, '#B71C1C') }
            for bt, cnt in blood_type_rows
        ]

        # Donation trends: last 6 months
        last6 = []
        for i in range(5, -1, -1):
            start = (today.replace(day=1) - timedelta(days=30*i))
            month_label = start.strftime('%b')
            # count donations in same month/year
            count = db.session.query(func.count(DonationHistory.id)).filter(
                func.extract('year', DonationHistory.donation_date) == start.year,
                func.extract('month', DonationHistory.donation_date) == start.month,
            ).scalar() or 0
            last6.append({ 'month': month_label, 'donations': int(count) })

        # Hospital donations top 5 last 30 days
        hosp_rows = db.session.query(
            Hospital.name, func.count(DonationHistory.id)
        ).join(DonationHistory, DonationHistory.hospital_id == Hospital.id).filter(
            DonationHistory.donation_date >= month_ago
        ).group_by(Hospital.name).order_by(func.count(DonationHistory.id).desc()).limit(5).all()
        hospital_donations = [ { 'hospital': n, 'donations': int(c) } for n, c in hosp_rows ]

        # Request status analysis
        statuses = ['completed', 'pending', 'cancelled']
        color_status = { 'completed': '#10B981', 'pending': '#F59E0B', 'cancelled': '#EF4444' }
        request_analysis = []
        for s in statuses:
            cnt = db.session.query(func.count(Request.id)).filter(Request.status == s).scalar() or 0
            request_analysis.append({ 'status': s.capitalize(), 'count': int(cnt), 'color': color_status[s] })

        charts = {
            'bloodGroups': blood_groups,
            'donationTrends': last6,
            'hospitalDonations': hospital_donations,
            'requestAnalysis': request_analysis,
        }

        # Recent activities (last 10 donations)
        recent_rows = db.session.query(
            DonationHistory.id,
            DonationHistory.units,
            DonationHistory.donation_date,
            Donor.blood_group,
            Hospital.name.label('hospital_name'),
            User.first_name, User.last_name
        ).join(Donor, DonationHistory.donor_id == Donor.id)
        recent_rows = recent_rows.join(User, Donor.user_id == User.id)
        recent_rows = recent_rows.outerjoin(Hospital, DonationHistory.hospital_id == Hospital.id)
        recent_rows = recent_rows.order_by(DonationHistory.donation_date.desc()).limit(10).all()

        def rel_time(dt):
            if not dt:
                return 'Just now'
            delta = datetime.now() - dt
            hours = int(delta.total_seconds() // 3600)
            if hours < 1:
                mins = int(delta.total_seconds() // 60)
                return f"{mins} minutes ago" if mins > 0 else "Just now"
            if hours < 24:
                return f"{hours} hours ago"
            days = hours // 24
            return f"{days} days ago"

        activities = []
        for row in recent_rows:
            activities.append({
                'id': row.id,
                'donor': f"{row.first_name or ''} {row.last_name or ''}".strip() or 'Donor',
                'hospital': row.hospital_name or 'Unknown Hospital',
                'bloodType': row.blood_group or 'N/A',
                'units': int(row.units) if row.units else 0,
                'status': 'completed',
                'time': rel_time(row.donation_date),
                'priority': 'normal'
            })

        logger.info("Dashboard summary generated successfully")
        return jsonify({
            'success': True,
            'data': {
                'totals': totals,
                'charts': charts,
                'activities': activities,
                'welcome': {
                    'donations_today': int(donations_today),
                    'urgent_requests': int(urgent_pending),
                },
                'last_updated': datetime.now().isoformat(),
            }
        })

    except Exception as e:
        logger.error(f"Error generating dashboard summary: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to generate dashboard summary'}), 500
