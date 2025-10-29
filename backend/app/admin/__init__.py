from flask import Blueprint
admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# Register all admin routes
from .routes import *
from .match_routes import *
from .login import *
from .dashboard import *

# Ensure donation routes are available
__all__ = ['admin_bp', 'donation_bp']
from .donation_routes import donation_bp