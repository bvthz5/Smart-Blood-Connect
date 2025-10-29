from flask import Blueprint, request, jsonify
from app.models import DonationHistory, User, Donor, Hospital
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, func
from datetime import datetime
import csv
from io import StringIO

donation_bp = Blueprint('donation', __name__, url_prefix='/api/admin')

@donation_bp.route('/donation-history', methods=['GET'])
@jwt_required()
def get_donation_history():
    """Get donation history with pagination and filters"""
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401

        # Get query parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '').strip()
        donor_name = request.args.get('donor_name', '').strip()
        hospital_name = request.args.get('hospital_name', '').strip()
        blood_group = request.args.get('blood_group', '').strip()
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        status = request.args.get('status', '').strip()

        # Build base query with joins
        query = db.session.query(DonationHistory, User, Donor, Hospital)\
            .join(Donor, DonationHistory.donor_id == Donor.id)\
            .join(User, Donor.user_id == User.id)\
            .join(Hospital, DonationHistory.hospital_id == Hospital.id)

        # Apply filters
        if search:
            search_filter = or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                Hospital.name.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)

        if donor_name:
            donor_filter = or_(
                User.first_name.ilike(f'%{donor_name}%'),
                User.last_name.ilike(f'%{donor_name}%')
            )
            query = query.filter(donor_filter)

        if hospital_name:
            query = query.filter(Hospital.name.ilike(f'%{hospital_name}%'))

        if blood_group:
            query = query.filter(Donor.blood_group == blood_group)

        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(DonationHistory.donation_date >= from_date)
            except ValueError:
                pass

        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                query = query.filter(DonationHistory.donation_date <= to_date)
            except ValueError:
                pass

        if status:
            query = query.filter(DonationHistory.status == status)

        # Order by donation date descending
        query = query.order_by(DonationHistory.donation_date.desc())

        # Paginate results
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format response
        donations = []
        for history, user, donor, hospital in pagination.items:
            donations.append({
                'id': history.id,
                'donor': {
                    'id': donor.id,
                    'name': f"{user.first_name} {user.last_name}".strip(),
                    'phone': user.phone,
                    'email': user.email,
                    'blood_group': donor.blood_group
                },
                'hospital': {
                    'id': hospital.id,
                    'name': hospital.name,
                    'address': hospital.address,
                    'phone': hospital.phone
                },
                'units': history.units,
                'donation_date': history.donation_date.isoformat() if history.donation_date else None,
                'status': getattr(history, 'status', 'completed'),
                'location': getattr(history, 'location', None),
                'notes': getattr(history, 'notes', None),
                'created_at': history.created_at.isoformat() if hasattr(history, 'created_at') and history.created_at else None,
                'updated_at': history.updated_at.isoformat() if hasattr(history, 'updated_at') and history.updated_at else None,
                'request_id': history.request_id
            })

        return jsonify({
            'donations': donations,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }), 200

    except Exception as e:
        print(f"Error fetching donation history: {str(e)}")
        return jsonify({"error": "Failed to fetch donation history"}), 500

@donation_bp.route('/donation-history/export', methods=['GET'])
@jwt_required()
def export_donation_history():
    """Export donation history to CSV"""
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401

        # Get filter parameters
        search = request.args.get('search', '').strip()
        donor_name = request.args.get('donor_name', '').strip()
        hospital_name = request.args.get('hospital_name', '').strip()
        blood_group = request.args.get('blood_group', '').strip()
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        # Build query with joins
        query = db.session.query(DonationHistory, User, Donor, Hospital)\
            .join(Donor, DonationHistory.donor_id == Donor.id)\
            .join(User, Donor.user_id == User.id)\
            .join(Hospital, DonationHistory.hospital_id == Hospital.id)

        # Apply filters
        if search:
            search_filter = or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                Hospital.name.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)

        if donor_name:
            donor_filter = or_(
                User.first_name.ilike(f'%{donor_name}%'),
                User.last_name.ilike(f'%{donor_name}%')
            )
            query = query.filter(donor_filter)

        if hospital_name:
            query = query.filter(Hospital.name.ilike(f'%{hospital_name}%'))

        if blood_group:
            query = query.filter(Donor.blood_group == blood_group)

        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(DonationHistory.donation_date >= from_date)
            except ValueError:
                pass

        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                query = query.filter(DonationHistory.donation_date <= to_date)
            except ValueError:
                pass

        # Order by donation date descending
        query = query.order_by(DonationHistory.donation_date.desc())

        # Create CSV file in memory
        output = StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            'Donation ID',
            'Donor ID',
            'Donor Name',
            'Hospital',
            'Blood Group',
            'Donation Date',
            'Units',
            'Status',
            'Location',
            'Notes'
        ])

        # Write data
        for history, user, donor, hospital in query.all():
            writer.writerow([
                history.id,
                donor.id,
                f"{user.first_name} {user.last_name}".strip(),
                hospital.name,
                donor.blood_group,
                history.donation_date.strftime('%Y-%m-%d') if history.donation_date else '',
                history.units,
                history.status,
                history.location or '',
                history.notes or ''
            ])

        # Prepare response
        output.seek(0)
        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': f'attachment; filename=donation-history-{datetime.now().strftime("%Y-%m-%d")}.csv'
        }

    except Exception as e:
        print(f"Error exporting donation history: {str(e)}")
        return jsonify({"error": "Failed to export donation history"}), 500

@donation_bp.route('/donation-history/stats', methods=['GET'])
@jwt_required()
def get_donation_stats():
    """Get donation statistics"""
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401

        # Get total donations
        total_donations = DonationHistory.query.count()

        # Get total donors who have donated
        total_donors = db.session.query(func.count(func.distinct(DonationHistory.donor_id))).scalar()

        # Get total hospitals that have received donations
        total_hospitals = db.session.query(func.count(func.distinct(DonationHistory.hospital_id))).scalar()

        # Get donations by status
        status_counts = db.session.query(
            DonationHistory.status,
            func.count(DonationHistory.id)
        ).group_by(DonationHistory.status).all()
        
        # Get donations by blood group
        blood_group_counts = db.session.query(
            Donor.blood_group,
            func.count(DonationHistory.id)
        ).join(DonationHistory, DonationHistory.donor_id == Donor.id)\
         .group_by(Donor.blood_group).all()

        # Format response
        return jsonify({
            'total_donations': total_donations,
            'total_donors': total_donors,
            'total_hospitals': total_hospitals,
            'status_distribution': dict(status_counts),
            'blood_group_distribution': dict(blood_group_counts)
        }), 200

    except Exception as e:
        print(f"Error fetching donation stats: {str(e)}")
        return jsonify({"error": "Failed to fetch donation statistics"}), 500