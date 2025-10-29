from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Request, Donor, Match, Hospital, User
from datetime import datetime
from sqlalchemy import and_, or_, desc, func
from flask_jwt_extended import jwt_required, get_jwt_identity

admin_match_bp = Blueprint("admin_match", __name__, url_prefix="/api/admin/matches")

@admin_match_bp.route("/", methods=["GET"])
@jwt_required()
def get_all_matches():
    """
    Get all blood matches with search, filter, and pagination
    """
    try:
        # Get query parameters
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()
        blood_group = request.args.get('blood_group', '').strip()
        urgency = request.args.get('urgency', '').strip()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        sort_by = request.args.get('sort_by', 'match_score')
        sort_order = request.args.get('sort_order', 'desc')

        # Build base query with joins
        query = Match.query.join(
            Request, Match.request_id == Request.id
        ).join(
            Donor, Match.donor_id == Donor.id
        ).join(
            Hospital, Request.hospital_id == Hospital.id
        ).join(
            User, Donor.user_id == User.id
        )

        # Apply filters
        if search:
            search_filter = or_(
                Request.patient_name.ilike(f'%{search}%'),
                func.concat(User.first_name, ' ', User.last_name).ilike(f'%{search}%'),
                Hospital.name.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)

        if status:
            query = query.filter(Match.status == status)

        if blood_group:
            query = query.filter(Request.blood_group == blood_group)

        if urgency:
            query = query.filter(Request.urgency == urgency)

        # Apply sorting
        if sort_by == 'match_score':
            query = query.order_by(desc(Match.match_score) if sort_order == 'desc' else Match.match_score)
        elif sort_by == 'created_at':
            query = query.order_by(desc(Match.matched_at) if sort_order == 'desc' else Match.matched_at)

        # Get paginated results
        matches_pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        matches_data = []
        for match in matches_pagination.items:
            matches_data.append({
                "id": match.id,
                "donor_name": f"{match.donor.user.first_name} {match.donor.user.last_name}".strip(),
                "donor_email": match.donor.user.email,
                "donor_phone": match.donor.user.phone,
                "hospital_name": match.request.hospital.name,
                "hospital_city": match.request.hospital.city,
                "patient_name": match.request.patient_name,
                "blood_group": match.request.blood_group,
                "units_required": match.request.units_required,
                "urgency": match.request.urgency,
                "match_score": round(float(match.match_score), 1),
                "status": match.status,
                "matched_at": match.matched_at.isoformat() if match.matched_at else None,
                "confirmed_at": match.confirmed_at.isoformat() if match.confirmed_at else None,
                "completed_at": match.completed_at.isoformat() if match.completed_at else None,
                "notes": match.notes
            })

        return jsonify({
            "matches": matches_data,
            "total": matches_pagination.total,
            "pages": matches_pagination.pages,
            "page": page,
            "per_page": per_page
        }), 200

    except Exception as e:
        print(f"Error fetching matches: {str(e)}")
        return jsonify({
            "error": "Failed to fetch matches",
            "message": str(e) if request.debug else "An error occurred"
        }), 500

@admin_match_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_match_stats():
    """
    Get match statistics
    """
    try:
        total_matches = Match.query.count()
        pending_matches = Match.query.filter_by(status="pending").count()
        accepted_matches = Match.query.filter_by(status="accepted").count()
        completed_matches = Match.query.filter_by(status="completed").count()

        return jsonify({
            "total": total_matches,
            "pending": pending_matches,
            "accepted": accepted_matches,
            "completed": completed_matches
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Failed to fetch match statistics",
            "message": str(e)
        }), 500

@admin_match_bp.route("/<int:match_id>/status", methods=["PUT"])
@jwt_required()
def update_match_status(match_id):
    """
    Update match status (accept, decline, complete)
    """
    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404

        data = request.get_json() or {}
        new_status = data.get('status')
        notes = data.get('notes', '')

        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        if new_status not in ['pending', 'accepted', 'declined', 'completed', 'cancelled']:
            return jsonify({"error": "Invalid status"}), 400

        match.status = new_status
        match.notes = notes

        # Update timestamps based on status
        if new_status == 'accepted':
            match.confirmed_at = datetime.utcnow()
        elif new_status == 'completed':
            match.completed_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            "message": "Match status updated successfully",
            "match_id": match_id,
            "status": new_status
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to update match status",
            "message": str(e)
        }), 500

@admin_match_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate_matches():
    """
    Generate matches for a request using ML-based scoring
    """
    data = request.get_json() or {}
    req_id = data.get("request_id")
    top_n = int(data.get("top_n", 5))

    if not req_id:
        return jsonify({"error": "request_id is required"}), 400

    try:
        # Get the blood request
        req = Request.query.get(req_id)
        if not req:
            return jsonify({"error": "request not found"}), 404

        # Get candidate donors based on blood group compatibility
        candidates = db.session.query(Donor).join(Donor.user).filter(
            and_(Donor.blood_group == req.blood_group, Donor.availability_status == "available")
        ).limit(200).all()

        if not candidates:
            return jsonify({
                "matched": 0,
                "message": "No compatible donors found"
            }), 200

        # Score and rank candidates
        scored_candidates = []
        for donor in candidates:
            # Base score is reliability score
            base_score = donor.reliability_score or 0.0
            
            # Distance factor (placeholder - would use actual geocoding)
            distance_km = 10  # Placeholder: need to calculate real distance
            distance_score = max(0, 100 - distance_km) / 100  # Normalize to 0-1
            
            # Urgency boost
            urgency_boost = {
                'high': 0.3,
                'medium': 0.2,
                'low': 0.1
            }.get(req.urgency, 0.1)
            
            # Calculate final score
            final_score = base_score * (1 + distance_score + urgency_boost)
            
            scored_candidates.append((donor, final_score))

        # Sort and get top N candidates
        sorted_candidates = sorted(
            scored_candidates,
            key=lambda x: x[1],
            reverse=True
        )[:top_n]

        # Create match records
        created = 0
        for rank, (donor, score) in enumerate(sorted_candidates, start=1):
            match = Match(
                request_id=req.id,
                donor_id=donor.id,
                match_score=score,
                status="notified",
                notified_at=datetime.utcnow()
            )
            db.session.add(match)
            created += 1

        db.session.commit()

        return jsonify({
            "matched": created,
            "request_id": req_id,
            "message": f"Successfully generated {created} matches"
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Failed to generate matches",
            "message": str(e)
        }), 500
