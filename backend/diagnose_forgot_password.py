"""
Diagnostic script to test forgot password endpoints
Run: python -m diagnose_forgot_password
"""
import requests
import json

print("=" * 60)
print("FORGOT PASSWORD ENDPOINTS DIAGNOSTIC")
print("=" * 60)

BASE_URL = "http://127.0.0.1:5000"

# Test 1: Admin Forgot Password
print("\n1. Testing Admin Forgot Password Endpoint")
print("-" * 60)
admin_email = "admin@smartblood.com"
print(f"Sending request to: {BASE_URL}/admin/auth/forgot-password")
print(f"Email: {admin_email}")

try:
    response = requests.post(
        f"{BASE_URL}/admin/auth/forgot-password",
        json={"email": admin_email},
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        print("✅ Admin forgot password endpoint is working!")
    else:
        print("❌ Admin forgot password endpoint returned error")
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Test 2: Seeker Forgot Password (Email)
print("\n2. Testing Seeker Forgot Password Endpoint (Email)")
print("-" * 60)
seeker_email = "admin@smartblood.com"  # Using admin email for testing
print(f"Sending request to: {BASE_URL}/api/auth/forgot-password")
print(f"Email: {seeker_email}")

try:
    response = requests.post(
        f"{BASE_URL}/api/auth/forgot-password",
        json={"email_or_phone": seeker_email},
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        print("✅ Seeker forgot password endpoint is working!")
    else:
        print("❌ Seeker forgot password endpoint returned error")
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Test 3: Check if backend is running
print("\n3. Checking Backend Status")
print("-" * 60)
try:
    response = requests.get(f"{BASE_URL}/")
    print(f"✅ Backend is running at {BASE_URL}")
except Exception as e:
    print(f"❌ Backend is not accessible: {str(e)}")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
print("\nNOTE: Check the backend terminal for detailed logs with [EMAIL SERVICE] prefix")
