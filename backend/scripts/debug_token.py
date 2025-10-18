"""
Debug token to see what's inside
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask_jwt_extended import decode_token
from app import create_app

app = create_app()

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MDI3NjYwMCwianRpIjoiNTU2ZmU3MmItMTUyZi00NTZmLWJmMWQtOWMxMzlmZGM0ZjBkIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjEiLCJuYmYiOjE3NjAyNzY2MDAsImNzcmYiOiI1NjJjMDE1MC1lYzI5LTQxZTEtOWQ0Ny05NWQ5ZWZjNjYxODMiLCJleHAiOjE3NjAyNzc1MDAsInByIjoiYWRtaW5fcmVzZXQifQ.yZMpH0zRDdjtovpz6XZhKvY6s9XbtX7IBKZbwdtdW7o"

with app.app_context():
    try:
        decoded = decode_token(token)
        print("Token decoded successfully!")
        print("\nToken contents:")
        for key, value in decoded.items():
            print(f"  {key}: {value}")
        
        print("\n" + "="*60)
        print("Checking reset password requirements:")
        print(f"  type == 'access': {decoded.get('type') == 'access'}")
        
        # Check claims
        claims = decoded.get('claims') or {}
        print(f"  claims: {claims}")
        print(f"  pr == 'admin_reset': {claims.get('pr') == 'admin_reset'}")
        
        # Check if 'pr' is in the main token body instead of claims
        print(f"  pr in main body: {decoded.get('pr')}")
        
    except Exception as e:
        print(f"Error decoding token: {str(e)}")
        import traceback
        traceback.print_exc()
