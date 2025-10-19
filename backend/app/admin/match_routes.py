# backend/app/admin/match_routes.py
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Request, Donor, Match
from datetime import datetime
from sqlalchemy import and_

admin_match_bp = Blueprint("admin_match", __name__, url_prefix="/api/admin/match")

def simple_distance_score(dummy_dist_km):
    # placeholder: convert distance to score (lower distance -> higher score)
    return max(0, 100 - dummy_dist_km)

@admin_match_bp.route("/generate", methods=["POST"])
def generate_matches():
    """
    Admin/dev endpoint (no auth for simplicity) to generate matches for a request.
    Body: { request_id, top_n (default 5) }
    Strategy:
      - select donors with same blood_group and availability_status == 'available'
      - rank by arbitrary score (we don't have geodata here), create Match rows
    """
    data = request.get_json() or {}
    req_id = data.get("request_id")
    top_n = int(data.get("top_n", 5))
    req = Request.query.get(req_id)
    if not req:
        return jsonify({"error": "request not found"}), 404

    # simple candidate filter
    candidates = db.session.query(Donor).join(Donor.user).filter(
        and_(Donor.blood_group == req.blood_group, Donor.availability_status == "available")
    ).limit(200).all()

    if not candidates:
        return jsonify({"matched": 0}), 200

    # simple scoring: use reliability_score descending
    sorted_cand = sorted(candidates, key=lambda d: (-(d.reliability_score or 0)))
    created = 0
    for rank, donor in enumerate(sorted_cand[:top_n], start=1):
        mr = Match(request_id=req.id, donor_id=donor.id, match_score=donor.reliability_score or 0.0, status="notified", notified_at=datetime.utcnow())
        db.session.add(mr)
        created += 1
    db.session.commit()
    return jsonify({"matched": created}), 201
