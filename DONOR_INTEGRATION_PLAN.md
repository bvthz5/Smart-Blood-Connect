# Smart Blood Connect - Donor Module Integration Plan

## ✅ COMPLETED TASKS

### Phase 1: Critical Fixes
- [x] Fixed backend 500 error on `/api/requests/nearby` endpoint (missing Hospital import)
- [x] Created `DonorProtectedRoute` component with:
  - Auto token refresh (every 14 minutes)
  - Browser close auto-logout
  - Active donor status verification
  - Redirect after login functionality

---

## 🚀 IMPLEMENTATION PHASES

### Phase 2: Route Protection & Authentication (IN PROGRESS)
**Priority: CRITICAL**

#### Tasks:
1. **Update App.jsx Routes**
   - [ ] Wrap all donor routes with `DonorProtectedRoute`
   - [ ] Add redirect handling after successful login

2. **Fix Geolocation Permission Handling**
   - [ ] Update `DonorDashboard.jsx` geolocation error handling
   - [ ] Add user-friendly permission request UI
   - [ ] Implement fallback location selection

3. **Token Management**
   - [x] Auto-refresh mechanism (every 14 minutes)
   - [ ] Handle refresh token expiry gracefully
   - [ ] Add token validation on every API call

---

### Phase 3: Dashboard Components Integration
**Priority: HIGH**

#### 3.1 Stats Grid
- [ ] Integrate with backend API
- [ ] Display: Total Donations, Lives Saved, Active Requests, Next Eligibility
- [ ] Real-time updates
- [ ] Responsive design (3 columns → 2 → 1)

#### 3.2 AI Insights Card
- [ ] Connect to ML prediction model
- [ ] Display predictive match opportunities
- [ ] Show personalized recommendations

#### 3.3 Critical Requests Card
- [ ] Fetch urgent/critical requests from backend
- [ ] Display top 3 critical matches
- [ ] Real-time status updates

#### 3.4 Donations List
- [ ] Fetch donation history from API
- [ ] Display recent donations with details
- [ ] "View Details" button → route to detailed view page
- [ ] Remove filter button (as requested)

---

### Phase 4: Digital Certificates & Badges System
**Priority: HIGH**

#### 4.1 Certificate Generation
**Storage:** Cloud Storage (Firebase Storage/AWS S3/Cloudinary)

**Implementation:**
```javascript
// When donation is completed:
POST /api/donations/{id}/complete
→ Triggers certificate generation
→ Uploads to cloud storage
→ Returns certificate URL
→ Stores URL in database (donations table)
```

**Certificate Template:**
- Donor name, blood group, donation date
- Hospital name, units donated
- Unique certificate ID, QR code
- Digital signature

**Tech Stack:**
- Frontend: `jsPDF` or `react-pdf` for generation
- Backend: Python `reportlab` or `weasyprint`
- Storage: Cloudinary/AWS S3

#### 4.2 Badge System
**Badge Types:**
- First Donation
- 5 Donations Milestone
- 10 Donations Milestone  
- 25 Donations Hero
- 50 Donations Legend
- Life Saver (Urgent requests)
- Consistent Donor (Monthly)

**Storage:** Cloud storage (same as certificates)

**Implementation:**
- Automatic badge awarding based on donation count
- Badge unlock notifications
- Display on profile page
- Shareable badge images

---

### Phase 5: Donation Detail View Page
**Priority: MEDIUM**

#### New Route: `/donor/donations/:id`

**Features:**
- Complete donation information
- Hospital details with map location
- Certificate download button
- Donation timeline
- Related badges earned
- Share on social media

---

### Phase 6: Next Eligibility Page Enhancement
**Priority: MEDIUM**

#### Features to Add:
- [ ] Calendar view of next donation date
- [ ] Countdown timer (days remaining)
- [ ] Health tips for donors
- [ ] Notification reminder setup
- [ ] Progress bar visualization (0-56 days)

---

### Phase 7: Match Request System (Hospital Integration)
**Priority: CRITICAL**

#### 7.1 Hospital Raises Request
```
Hospital Dashboard → Create Blood Request
↓
System searches compatible donors within radius
↓
Sends match notifications to top compatible donors
```

#### 7.2 Donor Receives Match Request
**Route:** `/donor/manage-requests`

**Features:**
- [ ] List of pending match requests
- [ ] Request details (hospital, blood group, urgency, distance)
- [ ] Accept/Reject buttons
- [ ] Hospital location on map (Google Maps/Mapbox)
- [ ] Contact information (after acceptance)

#### 7.3 Request Flow:
```
Donor views request → Accept → Notify hospital → Show hospital contact
                    → Reject → Remove from donor's list → Notify system
```

#### 7.4 Request History:
- [ ] Accepted requests
- [ ] Completed donations
- [ ] Rejected requests (with reason)
- [ ] Archived older than 30 days

---

### Phase 8: Nearby Requests (Manual Donation Search)
**Priority: HIGH**

#### Route: `/donor/nearby` (Already exists)

#### Enhancements Needed:
1. **Search & Filter**
   - [x] Basic location-based search
   - [ ] Blood group filter
   - [ ] Urgency level filter
   - [ ] Distance radius slider (0-50km)
   - [ ] Sort by: Distance, Urgency, Date

2. **Interactive Map View**
   - [ ] Integrate Google Maps or Mapbox
   - [ ] Show donor location (blue pin)
   - [ ] Show hospital locations (red pins)
   - [ ] Cluster markers for multiple requests
   - [ ] Click pin → Show request details popup

3. **Request Cards**
   - [ ] Display 4 requests per page
   - [ ] Pagination
   - [ ] Distance indicator
   - [ ] "View Details" → Expand card
   - [ ] "Donate Now" → Contact hospital

4. **Radius Visualization**
   - [ ] Draw circle around donor location showing search radius
   - [ ] Update dynamically with slider

---

### Phase 9: Notification System
**Priority: HIGH**

#### Types of Notifications:
1. **Match Requests** - New compatible blood request
2. **Request Updates** - Hospital accepted/rejected
3. **Donation Reminders** - Next eligibility approaching
4. **Badge Unlocked** - New achievement earned
5. **System Announcements** - Blood drives, events

#### Implementation:
```
Backend: Flask-SocketIO for real-time notifications
Frontend: Socket.io-client + React Context

Notification Table Schema:
- id, user_id, type, title, message, read_status
- created_at, action_url, priority
```

#### Features:
- [ ] Real-time push notifications
- [ ] Notification bell with count badge
- [ ] Notification dropdown list
- [ ] Mark as read functionality
- [ ] Filter by type
- [ ] Clear all notifications

---

### Phase 10: Settings & Security Page
**Priority: MEDIUM**

#### Route: `/donor/settings`

#### Sections:

**1. Account Settings**
- Update profile information
- Change email (with OTP verification)
- Change phone number (with OTP)
- Blood group (read-only after verification)

**2. Security**
- Change password
- Two-factor authentication (OTP-based)
- Active sessions management
- Login history

**3. Privacy**
- Profile visibility (public/private)
- Location sharing preferences
- Contact information visibility

**4. Notification Preferences**
- Email notifications ON/OFF
- SMS notifications ON/OFF
- Push notifications ON/OFF
- Notification types selection

**5. Availability Settings**
- Available for emergencies toggle
- Preferred donation times
- Maximum travel distance

**6. Danger Zone**
- Deactivate account
- Delete account (with confirmation)

---

### Phase 11: Donor Profile Redesign
**Priority: HIGH**

#### Route: `/donor/profile`

#### Issues to Fix:
- [x] Profile icon and name placement (no overlay)
- [ ] Proper card layout
- [ ] Responsive design
- [ ] Mobile optimization

#### New UI Components:

**1. Profile Header**
```
┌─────────────────────────────────────────┐
│ [Profile Avatar]    John Doe            │
│ Blood Group: A+     ⭐⭐⭐⭐ (15 Donations)│
│ Member Since: Jan 2024                  │
│ [Edit Profile Button]                   │
└─────────────────────────────────────────┘
```

**2. Statistics Cards**
- Total Donations, Lives Saved, Active Requests
- Next Eligibility Date
- Total Distance Traveled

**3. Badges Section**
- Display earned badges (3 per row on desktop)
- Locked badges (grayed out)
- Click badge → Show details

**4. Donation Timeline**
- Chronological list of donations
- Visual timeline with dates
- Hospital names and locations

**5. Certificates Gallery**
- Grid view of certificates (2-3 columns)
- Download/Share buttons
- Filter by year

---

### Phase 12: ML Model Integration
**Priority: MEDIUM**

#### Models Needed:

**1. Predictive Match Opportunities**
```python
# Predicts likelihood of blood request in area
# Based on: historical data, season, events, epidemics

Model: Time Series Forecasting (LSTM/Prophet)
Input: location, blood_group, historical_requests
Output: probability_score, predicted_date
```

**2. Donor Eligibility Prediction**
```python
# Predicts health status and next donation readiness
# Based on: last_donation, health_metrics, age, frequency

Model: Classification (Random Forest/XGBoost)
Input: donor_history, health_data
Output: eligibility_status, recommendations
```

**3. Request Priority Scoring**
```python
# Scores and ranks requests for donor matching
# Based on: urgency, distance, blood_group, compatibility

Model: Ranking/Scoring Algorithm
Input: donor_profile, request_details
Output: priority_score, compatibility_percentage
```

#### Integration Steps:
1. [ ] Create ML models using existing data
2. [ ] Train and validate models
3. [ ] Create Flask API endpoints
4. [ ] Store models in `models_artifacts/` directory
5. [ ] Create prediction service in `app/ml/`
6. [ ] Integrate with frontend dashboard

---

### Phase 13: Backend API Enhancements

#### New Endpoints Needed:

**Certificates:**
```
POST   /api/donations/{id}/generate-certificate
GET    /api/donations/{id}/certificate
GET    /api/donors/me/certificates
```

**Badges:**
```
GET    /api/donors/me/badges
POST   /api/donors/me/badges/{badge_id}/unlock
```

**Match Requests:**
```
GET    /api/donors/me/match-requests
POST   /api/match-requests/{id}/accept
POST   /api/match-requests/{id}/reject
GET    /api/match-requests/{id}/hospital-location
```

**Notifications:**
```
GET    /api/notifications
PUT    /api/notifications/{id}/read
PUT    /api/notifications/mark-all-read
DELETE /api/notifications/{id}
```

**Settings:**
```
PUT    /api/donors/me/settings
POST   /api/donors/me/change-password
POST   /api/donors/me/toggle-availability
GET    /api/donors/me/sessions
POST   /api/donors/me/deactivate
```

---

### Phase 14: Database Schema Updates

#### New Tables Needed:

**1. certificates**
```sql
CREATE TABLE certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donation_id INT NOT NULL FOREIGN KEY,
    donor_id INT NOT NULL FOREIGN KEY,
    certificate_url VARCHAR(500),
    generated_at TIMESTAMP,
    certificate_number VARCHAR(50) UNIQUE
);
```

**2. badges**
```sql
CREATE TABLE badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    description TEXT,
    icon_url VARCHAR(500),
    requirement_type VARCHAR(50),
    requirement_value INT
);
```

**3. donor_badges**
```sql
CREATE TABLE donor_badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT NOT NULL FOREIGN KEY,
    badge_id INT NOT NULL FOREIGN KEY,
    earned_at TIMESTAMP,
    UNIQUE(donor_id, badge_id)
);
```

**4. match_requests**
```sql
CREATE TABLE match_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL FOREIGN KEY,
    donor_id INT NOT NULL FOREIGN KEY,
    status ENUM('pending', 'accepted', 'rejected', 'completed'),
    created_at TIMESTAMP,
    responded_at TIMESTAMP,
    compatibility_score DECIMAL(5,2)
);
```

**5. notifications**
```sql
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL FOREIGN KEY,
    type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    read_status BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    created_at TIMESTAMP
);
```

**6. donor_settings**
```sql
CREATE TABLE donor_settings (
    donor_id INT PRIMARY KEY FOREIGN KEY,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    max_travel_distance INT DEFAULT 50,
    profile_visibility VARCHAR(20) DEFAULT 'public',
    updated_at TIMESTAMP
);
```

---

### Phase 15: Responsive Design Checklist

#### Breakpoints:
- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: < 768px

#### Components to Test:
- [ ] Dashboard header
- [ ] Stats grid (3→2→1 columns)
- [ ] Donation cards
- [ ] Map view
- [ ] Profile page
- [ ] Settings page
- [ ] Notification dropdown
- [ ] Forms

---

## 🛠 TECHNICAL STACK

### Frontend:
- React 18+ with Hooks
- React Router v6
- Axios for API calls
- Socket.io-client for real-time
- Google Maps API / Mapbox
- jsPDF for certificate generation
- React-Toastify for notifications
- CSS Modules / Styled Components

### Backend:
- Flask with Blueprints
- Flask-JWT-Extended
- Flask-SocketIO
- SQLAlchemy ORM
- Flask-CORS
- Python libraries: scikit-learn, pandas, numpy

### Database:
- PostgreSQL / MySQL
- Redis for caching

### Cloud Storage:
- Cloudinary / AWS S3 / Firebase Storage

### Deployment:
- Docker
- Nginx
- Gunicorn/uWSGI

---

## 📋 TESTING CHECKLIST

### Authentication:
- [ ] Login with valid credentials
- [ ] Auto token refresh
- [ ] Logout on browser close
- [ ] Redirect after login
- [ ] Protected route access denied

### Dashboard:
- [ ] Load all components
- [ ] Real-time stats update
- [ ] AI insights display
- [ ] Critical requests load

### Match Requests:
- [ ] Receive new match notification
- [ ] Accept request flow
- [ ] Reject request flow
- [ ] View hospital location on map

### Nearby Requests:
- [ ] Load requests within radius
- [ ] Filter by blood group
- [ ] Adjust radius slider
- [ ] Map markers display correctly
- [ ] Pagination works

### Donations:
- [ ] View donation history
- [ ] Click "View Details" → Detail page
- [ ] Download certificate
- [ ] Certificate stored in cloud

### Profile:
- [ ] Display correct information
- [ ] Edit profile
- [ ] No UI overlaps
- [ ] Responsive on mobile

### Settings:
- [ ] Update preferences
- [ ] Change password
- [ ] Toggle notifications
- [ ] Deactivate account

### Notifications:
- [ ] Receive real-time notifications
- [ ] Mark as read
- [ ] Clear notifications
- [ ] Notification bell count updates

---

## 🚨 CRITICAL ISSUES TO RESOLVE

1. **Backend 500 Error** ✅ FIXED
   - Missing `Hospital` import in `routes.py`

2. **Geolocation Permission**
   - Handle permission denied gracefully
   - Add fallback location selection

3. **Token Expiry Handling**
   - Implement silent refresh
   - Queue failed requests during refresh

4. **Database Migration**
   - Create migration scripts for new tables
   - Update existing tables if needed

---

## 📦 DEPENDENCIES TO INSTALL

### Frontend:
```bash
npm install socket.io-client
npm install jspdf
npm install react-pdf
npm install @react-google-maps/api
npm install react-toastify
npm install date-fns
```

### Backend:
```bash
pip install flask-socketio
pip install python-socketio
pip install boto3  # for AWS S3
pip install cloudinary  # for Cloudinary
pip install reportlab  # for PDF generation
pip install scikit-learn pandas numpy  # for ML
```

---

## ⏱ ESTIMATED TIMELINE

- **Phase 1-2**: Authentication & Route Protection - ✅ DONE + 2 days
- **Phase 3-5**: Dashboard & Components - 5 days
- **Phase 6-8**: Match Requests & Nearby Search - 7 days
- **Phase 9**: Notification System - 4 days
- **Phase 10-11**: Settings & Profile Redesign - 5 days
- **Phase 12**: ML Integration - 7 days
- **Phase 13-14**: Backend & Database - 5 days
- **Phase 15**: Responsive Design & Testing - 5 days

**Total: ~40 days of development**

---

## 📝 NOTES

- All changes must be tested thoroughly
- Follow existing code style and conventions
- Create backup before major changes
- Document all new API endpoints
- Write unit tests for critical functions

---

**Status:** IN PROGRESS 🚧
**Last Updated:** 2025-10-25
**Developer:** AI Assistant (Cascade)
