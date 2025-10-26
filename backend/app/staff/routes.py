from flask import request, jsonify, render_template_string, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.staff import staff_bp
from app.models import User, Hospital, HospitalStaff, Request, Match, db
from app.utils.email_sender import send_email
from app.utils.email_templates import get_staff_acceptance_confirmation_email
from datetime import datetime, timedelta


@staff_bp.route("/accept-invitation/<int:user_id>", methods=["GET"])
def accept_invitation(user_id):
    """
    Accept staff invitation - accessible via email link
    """
    try:
        # Get user and hospital staff record
        user = User.query.get(user_id)
        if not user:
            return render_acceptance_page(False, "Invalid invitation link")
        
        hospital_staff = HospitalStaff.query.filter_by(user_id=user_id).first()
        if not hospital_staff:
            return render_acceptance_page(False, "Invalid invitation link")
        
        hospital = Hospital.query.get(hospital_staff.hospital_id)
        if not hospital:
            return render_acceptance_page(False, "Hospital not found")
        
        # Check if already accepted
        if hospital_staff.status == "active":
            return render_acceptance_page(False, "This invitation has already been accepted")
        
        # Update statuses
        hospital_staff.status = "active"
        user.status = "active"  # User can now login
        # Mark hospital as verified now that staff accepted the invitation
        try:
            hospital.is_verified = True
            hospital.is_active = True
        except Exception:
            # be defensive if hospital is not found
            pass
        
        db.session.commit()
        
        # Send confirmation email
        try:
            staff_name = f"{user.first_name} {user.last_name}".strip()
            confirmation_email = get_staff_acceptance_confirmation_email(
                staff_name=staff_name,
                hospital_name=hospital.name
            )
            send_email(
                to_email=user.email,
                subject=f"Welcome to {hospital.name} - Smart Blood Connect",
                html_content=confirmation_email
            )
        except Exception as e:
            print(f"Failed to send confirmation email: {str(e)}")
        
        return render_acceptance_page(
            True, 
            f"Invitation accepted successfully! You can now login with your credentials.",
            user.email
        )
        
    except Exception as e:
        db.session.rollback()
        return render_acceptance_page(False, "Failed to accept invitation")


@staff_bp.route("/reject-invitation/<int:user_id>", methods=["GET"])
def reject_invitation(user_id):
    """
    Reject staff invitation - accessible via email link
    """
    try:
        # Get user and hospital staff record
        user = User.query.get(user_id)
        if not user:
            return render_rejection_page(False, "Invalid invitation link")
        
        hospital_staff = HospitalStaff.query.filter_by(user_id=user_id).first()
        if not hospital_staff:
            return render_rejection_page(False, "Invalid invitation link")
        
        hospital = Hospital.query.get(hospital_staff.hospital_id)
        
        # Update status to rejected
        hospital_staff.status = "rejected"
        user.status = "inactive"  # Keep user inactive
        # If invitation rejected, ensure hospital is not marked verified
        try:
            hospital.is_verified = False
        except Exception:
            pass
        
        db.session.commit()
        
        hospital_name = hospital.name if hospital else "the hospital"
        return render_rejection_page(
            True,
            f"You have declined the invitation from {hospital_name}."
        )
        
    except Exception as e:
        db.session.rollback()
        return render_rejection_page(False, "Failed to process rejection")


def render_acceptance_page(success, message, email=None):
    """
    Render acceptance page HTML
    """
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{'Success' if success else 'Error'} - Smart Blood Connect</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            .container {{
                max-width: 600px;
                background: white;
                border-radius: 20px;
                padding: 60px 40px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }}
            .icon {{
                font-size: 80px;
                margin-bottom: 20px;
            }}
            .success {{
                color: #10b981;
            }}
            .error {{
                color: #ef4444;
            }}
            h1 {{
                font-size: 32px;
                font-weight: 800;
                color: #1f2937;
                margin: 0 0 20px 0;
            }}
            p {{
                font-size: 18px;
                line-height: 1.6;
                color: #4b5563;
                margin: 0 0 30px 0;
            }}
            .credentials {{
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                border-radius: 12px;
                padding: 20px;
                margin: 30px 0;
            }}
            .credentials strong {{
                color: #1f2937;
                font-size: 16px;
            }}
            .btn {{
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 700;
                transition: all 0.2s ease;
            }}
            .btn:hover {{
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
            }}
            .note {{
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%);
                border-left: 4px solid #3b82f6;
                padding: 16px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }}
            .note p {{
                margin: 0;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon {'success' if success else 'error'}">
                {'✓' if success else '✗'}
            </div>
            <h1>{'Invitation Accepted!' if success else 'Error'}</h1>
            <p>{message}</p>
            
            {f'''
            <div class="credentials">
                <p><strong>Your Email:</strong> {email}</p>
            </div>
            
            <div class="note">
                <p><strong>🔒 Important:</strong> You will be required to change your password upon first login for security.</p>
            </div>
            
            <a href="/login" class="btn">Login to Dashboard</a>
            ''' if success and email else ''}
        </div>
    </body>
    </html>
    """
    return render_template_string(html)


def render_rejection_page(success, message):
    """
    Render rejection page HTML
    """
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation Declined - Smart Blood Connect</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            .container {{
                max-width: 600px;
                background: white;
                border-radius: 20px;
                padding: 60px 40px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }}
            .icon {{
                font-size: 80px;
                margin-bottom: 20px;
                color: #f59e0b;
            }}
            h1 {{
                font-size: 32px;
                font-weight: 800;
                color: #1f2937;
                margin: 0 0 20px 0;
            }}
            p {{
                font-size: 18px;
                line-height: 1.6;
                color: #4b5563;
                margin: 0 0 30px 0;
            }}
            .note {{
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%);
                border-left: 4px solid #f59e0b;
                padding: 16px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }}
            .note p {{
                margin: 0;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">ℹ️</div>
            <h1>Invitation Declined</h1>
            <p>{message}</p>

            <div class="note">
                <p>If you change your mind, please contact the hospital administrator to resend the invitation.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return render_template_string(html)


# ============================================================================
# HOSPITAL STAFF DASHBOARD ENDPOINTS
# ============================================================================

@staff_bp.route("/hospital-info", methods=["GET"])
@jwt_required()
def get_hospital_info():
    """Get hospital information for the logged-in staff member"""
    try:
        user_id = get_jwt_identity()
        staff = HospitalStaff.query.filter_by(user_id=int(user_id)).first()

        if not staff:
            return jsonify({"error": "Staff profile not found"}), 404

        hospital = Hospital.query.get(staff.hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404

        return jsonify({
            "id": hospital.id,
            "name": hospital.name,
            "email": hospital.email,
            "phone": hospital.phone,
            "address": hospital.address,
            "city": hospital.city,
            "state": hospital.state,
            "pincode": hospital.pincode,
            "license_number": hospital.license_number,
            "is_verified": hospital.is_verified,
            "is_active": hospital.is_active
        })
    except Exception as e:
        current_app.logger.error(f"Error getting hospital info: {str(e)}")
        return jsonify({"error": "Failed to get hospital info"}), 500


@staff_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard_data():
    """Get dashboard overview data for hospital staff"""
    try:
        user_id = get_jwt_identity()
        staff = HospitalStaff.query.filter_by(user_id=int(user_id)).first()

        if not staff:
            return jsonify({"error": "Staff profile not found"}), 404

        hospital_id = staff.hospital_id

        # Get request statistics
        active_requests = Request.query.filter_by(
            hospital_id=hospital_id,
            status='pending'
        ).count()

        fulfilled_requests = Request.query.filter_by(
            hospital_id=hospital_id,
            status='completed'
        ).count()

        pending_matches = Match.query.filter_by(
            status='pending'
        ).count()

        urgent_requests = Request.query.filter_by(
            hospital_id=hospital_id,
            urgency='high'
        ).count()

        # Get top blood type
        top_blood_type = 'O+'
        blood_group_counts = db.session.query(
            Request.blood_group,
            db.func.count(Request.id)
        ).filter_by(hospital_id=hospital_id).group_by(Request.blood_group).all()

        if blood_group_counts:
            top_blood_type = max(blood_group_counts, key=lambda x: x[1])[0]

        # Get monthly data
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        monthly_requests = db.session.query(
            db.func.date(Request.created_at),
            db.func.count(Request.id)
        ).filter(
            Request.hospital_id == hospital_id,
            Request.created_at >= thirty_days_ago
        ).group_by(db.func.date(Request.created_at)).all()

        monthly_labels = [str(r[0]) for r in monthly_requests]
        monthly_data = [r[1] for r in monthly_requests]

        # Get demand by blood group
        demand_by_group = []
        for bg, count in blood_group_counts:
            demand_by_group.append({"blood_group": bg, "count": count})

        # Get recent activity
        recent_requests = Request.query.filter_by(
            hospital_id=hospital_id
        ).order_by(Request.created_at.desc()).limit(5).all()

        activity = []
        for req in recent_requests:
            activity.append({
                "type": "request",
                "title": f"Request #{req.id}",
                "description": f"{req.units_required} units of {req.blood_group} needed",
                "timestamp": req.created_at.strftime("%Y-%m-%d %H:%M") if req.created_at else ""
            })

        return jsonify({
            "active_requests": active_requests,
            "fulfilled_requests": fulfilled_requests,
            "pending_matches": pending_matches,
            "urgent_requests": urgent_requests,
            "top_blood_type": top_blood_type,
            "total_donors": 0,
            "monthly_labels": monthly_labels,
            "monthly_data": monthly_data,
            "demand_by_group": demand_by_group,
            "recent_activity": activity
        })
    except Exception as e:
        current_app.logger.error(f"Error getting dashboard data: {str(e)}")
        return jsonify({"error": "Failed to get dashboard data", "details": str(e)}), 500
