"""
Homepage API routes for SmartBlood Connect
Handles homepage data including statistics, alerts, and dynamic content
"""

from flask import Blueprint, jsonify, request, current_app
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
        donors_count = 0
        try:
            donors_count = db.session.query(func.count(Donor.id)).join(
                User, Donor.user_id == User.id
            ).filter(
                User.status == "active"
            ).scalar() or 0
        except Exception as e:
            logger.warning(f'Error fetching donor count: {str(e)}')

        # Get total units collected (from donation history)
        units_collected = 0
        try:
            units_collected = db.session.query(func.sum(DonationHistory.units)).filter(
                DonationHistory.units.isnot(None)
            ).scalar() or 0
        except Exception as e:
            logger.warning(f'Error fetching units collected: {str(e)}')

        # Get active hospitals count
        hospitals_count = 0
        try:
            hospitals_count = db.session.query(func.count(Hospital.id)).filter(
                Hospital.is_active == True
            ).scalar() or 0
        except Exception as e:
            logger.warning(f'Error fetching hospitals count: {str(e)}')

        # Get districts covered (unique districts from hospitals)
        districts_count = 0
        try:
            districts_count = db.session.query(func.count(func.distinct(Hospital.district))).filter(
                Hospital.is_active == True,
                Hospital.district.isnot(None)
            ).scalar() or 0
        except Exception as e:
            logger.warning(f'Error fetching districts count: {str(e)}')

        # Get recent activity stats
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)

        # Recent donations (last 7 days)
        recent_donations = 0
        try:
            recent_donations = db.session.query(func.count(DonationHistory.id)).filter(
                DonationHistory.donation_date >= week_ago
            ).scalar() or 0
        except Exception as e:
            logger.warning(f'Error fetching recent donations: {str(e)}')

        # Recent requests (last 7 days)
        recent_requests = 0
        try:
            recent_requests = db.session.query(func.count(Request.id)).filter(
                Request.created_at >= week_ago
            ).scalar() or 0
        except Exception as e:
            logger.warning(f'Error fetching recent requests: {str(e)}')

        # Lives saved (estimated from completed donations)
        lives_saved = int(units_collected * 3) if units_collected else 0

        stats = {
            'donors_registered': int(donors_count),
            'units_collected': int(units_collected) if units_collected else 0,
            'active_hospitals': int(hospitals_count),
            'districts_covered': int(districts_count),
            'recent_donations': int(recent_donations),
            'recent_requests': int(recent_requests),
            'lives_saved': lives_saved,
            'last_updated': datetime.now().isoformat()
        }

        logger.info(f"Homepage stats retrieved: {stats}")
        return jsonify({
            'success': True,
            'data': stats
        })

    except Exception as e:
        logger.exception("Error fetching homepage stats")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch homepage statistics',
            'details': str(e) if current_app.debug else None
        }), 500

@homepage_bp.route('/api/homepage/alerts', methods=['GET'])
def get_homepage_alerts():
    """
    Get emergency alerts and blood shortage notifications
    """
    try:
        alerts = []

        # Get urgent blood requests (high urgency, recent)
        try:
            # Safe datetime comparison
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            urgent_requests = db.session.query(Request).filter(
                Request.urgency == 'high',
                Request.status == 'pending',
                Request.created_at >= cutoff_time
            ).limit(5).all()

            # Convert urgent requests to alerts (defensively)
            for req in urgent_requests:
                try:
                    # Safely get hospital and location
                    hospital = None
                    hospital_location = 'Unknown Location'

                    if hasattr(req, 'hospital_id') and req.hospital_id:
                        try:
                            hospital = Hospital.query.get(req.hospital_id)
                        except Exception:
                            hospital = None

                    if hospital:
                        hospital_location = getattr(hospital, 'address', None) or getattr(hospital, 'city', None) or 'Unknown Location'

                    blood_group = getattr(req, 'blood_group', None) or 'Unknown'
                    units_required = getattr(req, 'units_required', None) or 0
                    created_at = getattr(req, 'created_at', None)
                    created_at_iso = created_at.isoformat() if created_at is not None else datetime.utcnow().isoformat()
                    priority_val = getattr(req, 'urgency', None) or 'normal'
                    priority = 'urgent' if str(priority_val).lower() in ('high', 'urgent') else str(priority_val)

                    alert = {
                        'id': getattr(req, 'id', None),
                        'type': 'alert',
                        'title': f'Urgent Need: {blood_group} in {hospital_location}',
                        'message': f'({units_required} units needed) - Click to Help',
                        'blood_type': blood_group,
                        'location': hospital_location,
                        'quantity': units_required,
                        'created_at': created_at_iso,
                        'priority': priority,
                        'action_url': f'/seeker/request/{getattr(req, "id", "")}'
                    }
                    alerts.append(alert)
                except Exception as e:
                    logger.warning(f'Failed to convert urgent request {getattr(req, "id", "unknown")} to alert: {str(e)}')
                    continue
        except Exception as e:
            logger.warning(f'Error fetching urgent requests: {str(e)}')

        # Get upcoming blood camps
        try:
            today = datetime.utcnow().date()
            upcoming_camps = db.session.query(Hospital).filter(
                Hospital.next_camp_date.isnot(None),
                Hospital.next_camp_date >= today
            ).limit(3).all()

            for camp in upcoming_camps:
                try:
                    camp_location = getattr(camp, 'address', None) or getattr(camp, 'city', None) or 'Unknown Location'
                    next_date = getattr(camp, 'next_camp_date', None)
                    date_iso = next_date.isoformat() if next_date is not None else datetime.utcnow().isoformat()

                    alert = {
                        'id': f'camp_{getattr(camp, "id", "")}',
                        'type': 'camp',
                        'title': f'Blood Donation Camp at {getattr(camp, "name", "Hospital")}',
                        'message': f'{next_date.strftime("%B %d, %Y") if next_date is not None else "TBA"} - {camp_location}',
                        'hospital_name': getattr(camp, 'name', None),
                        'location': camp_location,
                        'date': date_iso,
                        'created_at': datetime.utcnow().isoformat(),
                        'action_url': f'/camps/{getattr(camp, "id", "")}'
                    }
                    alerts.append(alert)
                except Exception as e:
                    logger.warning(f'Failed to convert camp {getattr(camp, "id", "unknown")} to alert: {str(e)}')
                    continue
        except Exception as e:
            logger.warning(f'Error fetching upcoming camps: {str(e)}')

        # Sort alerts by priority (urgent first) and then by created_at (newest first)
        def sort_key(a):
            is_urgent = 1 if str(a.get('priority', '')).lower() == 'urgent' else 0
            # Use negative timestamp for reverse chronological order
            created = a.get('created_at', '')
            return (-is_urgent, created)  # Negative to get urgent first

        alerts.sort(key=sort_key, reverse=True)

        logger.info(f"Retrieved {len(alerts)} homepage alerts")
        return jsonify({
            'success': True,
            'data': alerts[:5]  # Return top 5 alerts
        })

    except Exception as e:
        logger.exception("Error fetching homepage alerts")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch alerts',
            'details': str(e) if current_app.debug else None
        }), 500

@homepage_bp.route('/api/homepage/testimonials', methods=['GET'])
def get_homepage_testimonials():
    """
    Get testimonials from donors and recipients
    """
    try:
        testimonials = []

        # Get recent successful matches for testimonials
        try:
            recent_matches = db.session.query(Match).filter(
                Match.status == 'completed',
                Match.matched_at >= datetime.now() - timedelta(days=30)
            ).limit(3).all()

            for match in recent_matches:
                try:
                    # Safely get donor and request info
                    donor = None
                    request_obj = None

                    if hasattr(match, 'donor_id') and match.donor_id:
                        donor = Donor.query.get(match.donor_id)

                    if hasattr(match, 'request_id') and match.request_id:
                        request_obj = Request.query.get(match.request_id)

                    if donor and request_obj:
                        # Get hospital through request
                        hospital = None
                        if hasattr(request_obj, 'hospital_id') and request_obj.hospital_id:
                            hospital = Hospital.query.get(request_obj.hospital_id)

                        # Get donor's user info
                        user = None
                        if hasattr(donor, 'user_id') and donor.user_id:
                            user = User.query.get(donor.user_id)

                        if user and hospital:
                            testimonial = {
                                'id': match.id,
                                'quote': f"SmartBlood helped me donate blood at {hospital.name} and save lives.",
                                'author': f"{user.first_name} {user.last_name}",
                                'role': 'Blood Donor',
                                'hospital': hospital.name,
                                'created_at': match.matched_at.isoformat() if match.matched_at else datetime.now().isoformat()
                            }
                            testimonials.append(testimonial)
                except Exception as e:
                    logger.warning(f'Failed to convert match {getattr(match, "id", "unknown")} to testimonial: {str(e)}')
                    continue
        except Exception as e:
            logger.warning(f'Error fetching recent matches: {str(e)}')

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
        logger.exception("Error fetching testimonials")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch testimonials',
            'details': str(e) if current_app.debug else None
        }), 500

@homepage_bp.route('/api/homepage/blood-availability', methods=['GET'])
def get_blood_availability():
    """
    Get current blood availability across different blood types
    """
    try:
        blood_availability = {}

        # Get blood type availability from donors (active donors by blood group)
        try:
            blood_type_rows = db.session.query(
                Donor.blood_group, func.count(Donor.id)
            ).join(User, Donor.user_id == User.id).filter(
                User.status == "active", Donor.blood_group.isnot(None)
            ).group_by(Donor.blood_group).all()

            for blood_group, count in blood_type_rows:
                if blood_group:  # Ensure blood_group is not None
                    blood_availability[blood_group] = {
                        'available_units': int(count),
                        'hospitals_count': 1,
                        'status': 'available' if count > 0 else 'unavailable'
                    }
        except Exception as e:
            logger.warning(f'Error fetching blood type availability: {str(e)}')

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
        logger.exception("Error fetching blood availability")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch blood availability',
            'details': str(e) if current_app.debug else None
        }), 500

@homepage_bp.route('/api/homepage/featured-hospitals', methods=['GET'])
def get_featured_hospitals():
    """
    Get featured hospitals for the homepage
    """
    try:
        featured_hospitals = []

        # Get active hospitals with recent activity
        try:
            hospitals = db.session.query(Hospital).filter(
                Hospital.is_active == True,
                Hospital.featured == True
            ).limit(6).all()

            for hospital in hospitals:
                try:
                    # Get recent donation count for this hospital
                    recent_donations = 0
                    if hasattr(hospital, 'id') and hospital.id:
                        recent_donations = db.session.query(func.count(DonationHistory.id)).filter(
                            DonationHistory.hospital_id == hospital.id,
                            DonationHistory.donation_date >= datetime.now() - timedelta(days=30)
                        ).scalar() or 0

                    hospital_data = {
                        'id': hospital.id,
                        'name': getattr(hospital, 'name', 'Unknown Hospital'),
                        'location': getattr(hospital, 'address', None) or getattr(hospital, 'city', None) or 'Unknown',
                        'district': getattr(hospital, 'district', None),
                        'contact_number': getattr(hospital, 'phone', None),
                        'email': getattr(hospital, 'email', None),
                        'recent_donations': int(recent_donations),
                        'rating': 4.5,
                        'image_url': getattr(hospital, 'image_url', None)
                    }
                    featured_hospitals.append(hospital_data)
                except Exception as e:
                    logger.warning(f'Failed to process hospital {getattr(hospital, "id", "unknown")}: {str(e)}')
                    continue
        except Exception as e:
            logger.warning(f'Error fetching featured hospitals: {str(e)}')

        logger.info(f"Retrieved {len(featured_hospitals)} featured hospitals")
        return jsonify({
            'success': True,
            'data': featured_hospitals
        })

    except Exception as e:
        logger.exception("Error fetching featured hospitals")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch featured hospitals',
            'details': str(e) if current_app.debug else None
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

        total_units = db.session.query(func.sum(DonationHistory.units)).filter(
            DonationHistory.units.isnot(None)
        ).scalar() or 0

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
        blood_groups = []
        try:
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
                for bt, cnt in blood_type_rows if bt
            ]
        except Exception as e:
            logger.warning(f'Error fetching blood group distribution: {str(e)}')

        # Donation trends: last 6 months
        last6 = []
        try:
            for i in range(5, -1, -1):
                start = (today.replace(day=1) - timedelta(days=30*i))
                month_label = start.strftime('%b')
                # count donations in same month/year
                count = db.session.query(func.count(DonationHistory.id)).filter(
                    func.extract('year', DonationHistory.donation_date) == start.year,
                    func.extract('month', DonationHistory.donation_date) == start.month,
                ).scalar() or 0
                last6.append({ 'month': month_label, 'donations': int(count) })
        except Exception as e:
            logger.warning(f'Error fetching donation trends: {str(e)}')

        # Hospital donations top 5 last 30 days
        hospital_donations = []
        try:
            hosp_rows = db.session.query(
                Hospital.name, func.count(DonationHistory.id)
            ).join(DonationHistory, DonationHistory.hospital_id == Hospital.id).filter(
                DonationHistory.donation_date >= month_ago
            ).group_by(Hospital.name).order_by(func.count(DonationHistory.id).desc()).limit(5).all()
            hospital_donations = [ { 'hospital': n, 'donations': int(c) } for n, c in hosp_rows if n ]
        except Exception as e:
            logger.warning(f'Error fetching hospital donations: {str(e)}')

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
        logger.exception("Error generating dashboard summary")
        return jsonify({
            'success': False,
            'error': 'Failed to generate dashboard summary',
            'details': str(e) if current_app.debug else None
        }), 500
