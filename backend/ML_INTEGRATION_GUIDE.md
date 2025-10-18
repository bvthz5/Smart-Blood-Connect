# SmartBlood ML Integration Guide

## Overview

The SmartBlood backend integrates 5 pre-trained machine learning models to provide intelligent donor-seeker matching, availability prediction, response time estimation, reliability scoring, and demand forecasting.

---

## 📂 Project Structure

```
backend/
├── models_artifacts/                    # ML model storage
│   ├── donor_seeker_model.pkl          # Donor-seeker matching
│   ├── donor_availability.pkl          # Availability prediction
│   ├── donor_response_time_model.pkl   # Response time estimation
│   ├── donor_reliability_model.pkl     # Reliability scoring
│   ├── kerala_demand_forecast_stacked_optuna.pkl  # Demand forecasting
│   └── model_map.json                  # Model metadata registry
│
├── app/
│   ├── ml/                             # ML module
│   │   ├── __init__.py
│   │   ├── model_client.py             # Thread-safe model loader
│   │   ├── feature_builder.py          # Feature engineering
│   │   └── routes.py                   # ML API endpoints
│   │
│   ├── tasks/                          # Background jobs
│   │   ├── __init__.py
│   │   ├── celery_app.py               # Celery instance
│   │   └── ml_tasks.py                 # ML background tasks
│   │
│   ├── config/
│   │   └── celery_config.py            # Celery configuration
│   │
│   └── models.py                       # Database models (includes ML tables)
│
└── requirements.txt                     # Python dependencies
```

---

## 🗄️ Database Models

### ModelArtifact
Tracks ML model versions and metadata.

```python
{
    "id": 1,
    "model_name": "donor_seeker_model",
    "version": "1.0.0",
    "artifact_path": "models_artifacts/donor_seeker_model.pkl",
    "metadata_json": {...},
    "is_active": true,
    "deployed_at": "2025-01-18T10:00:00"
}
```

### MatchPrediction
Stores ML-based donor-request match predictions.

```python
{
    "id": 1,
    "request_id": 123,
    "donor_id": 456,
    "match_score": 0.95,
    "availability_score": 0.88,
    "response_time_hours": 2.5,
    "reliability_score": 0.92,
    "rank": 1,
    "notified": false
}
```

### DemandForecast
Blood demand forecasts by district and blood group.

```python
{
    "id": 1,
    "district": "Ernakulam",
    "blood_group": "O+",
    "forecast_date": "2025-01-25",
    "predicted_demand": 45.2,
    "confidence_lower": 36.2,
    "confidence_upper": 54.2
}
```

### ModelPredictionLog
Logs all ML predictions for monitoring.

```python
{
    "id": 1,
    "model_name": "donor_seeker_match",
    "model_version": "1.0.0",
    "endpoint": "/api/ml/match",
    "inference_time_ms": 125.3,
    "success": true
}
```

---

## 🚀 API Endpoints

### 1. Health Check
```http
GET /api/ml/health
```

**Response:**
```json
{
    "status": "healthy",
    "models_available": 5,
    "models": [
        "donor_seeker_match",
        "donor_availability",
        "donor_response_time",
        "donor_reliability",
        "demand_forecast"
    ]
}
```

---

### 2. Match Donors (Primary Endpoint)
```http
POST /api/ml/match
```

**Request Body:**
```json
{
    "request_id": 123,
    "top_k": 10,
    "save_predictions": true
}
```

**Response:**
```json
{
    "request_id": 123,
    "matches": [
        {
            "donor_id": 456,
            "donor_name": "John Doe",
            "match_score": 0.95,
            "availability_score": 0.88,
            "response_time_hours": 2.5,
            "reliability_score": 0.92,
            "distance_km": 5.2,
            "blood_group": "O+",
            "phone": "+91-9876543210",
            "rank": 1
        }
    ],
    "total_candidates": 50,
    "inference_time_ms": 125.3
}
```

---

### 3. Predict Availability
```http
POST /api/ml/predict_availability
```

**Request Body:**
```json
{
    "donor_id": 456
}
```

**Response:**
```json
{
    "donor_id": 456,
    "availability_probability": 0.85,
    "is_likely_available": true,
    "confidence": "high",
    "inference_time_ms": 45.2
}
```

---

### 4. List Models
```http
GET /api/ml/models
```

**Response:**
```json
{
    "models": {
        "donor_seeker_match": {
            "name": "donor_seeker_model",
            "version": "1.0.0",
            "type": "classification",
            "features": ["blood_group_compatibility", "distance_km", ...]
        }
    },
    "total": 5
}
```

---

### 5. Reload Model (Admin)
```http
POST /api/ml/models/{model_key}/reload
```

**Response:**
```json
{
    "message": "Model donor_seeker_match reloaded successfully"
}
```

---

### 6. Prediction History
```http
GET /api/ml/predictions/history?request_id=123
```

**Response:**
```json
{
    "request_id": 123,
    "predictions": [
        {
            "donor_id": 456,
            "donor_name": "John Doe",
            "match_score": 0.95,
            "rank": 1,
            "notified": true,
            "created_at": "2025-01-18T10:30:00"
        }
    ],
    "total": 10
}
```

---

## ⚙️ Background Tasks (Celery)

### 1. Update Donor Reliability Scores
**Schedule:** Daily at midnight  
**Task:** `update_donor_reliability_scores`

Recalculates reliability scores for all donors based on donation history.

### 2. Generate Demand Forecasts
**Schedule:** Weekly  
**Task:** `generate_demand_forecasts`

Generates 30-day demand forecasts for all districts and blood groups.

### 3. Cleanup Old Predictions
**Schedule:** Weekly  
**Task:** `cleanup_old_predictions`

Removes prediction records older than 30 days to save database space.

---

## 🔧 Configuration

### Environment Variables

Add to `.env`:
```bash
# Celery/Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Running Celery Worker

```bash
# Start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info -Q ml_queue,default

# Start Celery beat (scheduler)
celery -A app.tasks.celery_app beat --loglevel=info
```

---

## 🧪 Testing

### Test ML Health
```bash
curl http://localhost:5000/api/ml/health
```

### Test Donor Matching
```bash
curl -X POST http://localhost:5000/api/ml/match \
  -H "Content-Type: application/json" \
  -d '{"request_id": 1, "top_k": 5}'
```

### Test Availability Prediction
```bash
curl -X POST http://localhost:5000/api/ml/predict_availability \
  -H "Content-Type: application/json" \
  -d '{"donor_id": 1}'
```

---

## 📊 Feature Engineering

### Donor-Seeker Match Features
- `blood_group_compatibility`: Binary (0/1)
- `distance_km`: Haversine distance
- `donor_availability`: Binary (0/1)
- `last_donation_days`: Days since last donation
- `reliability_score`: 0.0 to 1.0
- `urgency_level`: 1-4 (low to critical)
- `units_required`: Integer

### Availability Features
- `time_since_last_donation`: Days
- `total_donations`: Count
- `response_rate`: Historical rate
- `day_of_week`: 0-6
- `hour_of_day`: 0-23
- `is_weekend`: Binary
- `is_business_hours`: Binary

### Response Time Features
- `distance_km`: Distance to hospital
- `donor_age`: Years
- `past_response_times`: Average hours
- `urgency_level`: 1-4
- `time_of_day`: Hour
- `is_weekend`: Binary

---

## 🔍 Monitoring

### Check Prediction Logs
```sql
SELECT * FROM model_prediction_logs 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Check Model Performance
```sql
SELECT 
    model_name,
    AVG(inference_time_ms) as avg_latency,
    COUNT(*) as total_predictions,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
FROM model_prediction_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY model_name;
```

---

## 🚨 Troubleshooting

### Models Not Loading
1. Check `models_artifacts/` directory exists
2. Verify all `.pkl` files are present
3. Check `model_map.json` paths are correct
4. Review logs: `[ML] Model initialization error`

### Slow Predictions
1. Check model sizes (large models = slow loading)
2. Preload models at startup (done automatically for critical models)
3. Monitor `inference_time_ms` in logs

### Celery Tasks Not Running
1. Ensure Redis is running: `redis-cli ping`
2. Check Celery worker is running
3. Check Celery beat scheduler is running
4. Review Celery logs

---

## 📈 Performance Optimization

### Model Caching
Models are cached in memory after first load. Use hot-reload only when necessary.

### Batch Predictions
For multiple donors, use vectorized predictions instead of loops.

### Database Indexing
```sql
CREATE INDEX idx_match_predictions_request ON match_predictions(request_id);
CREATE INDEX idx_match_predictions_donor ON match_predictions(donor_id);
CREATE INDEX idx_demand_forecast_lookup ON demand_forecasts(district, blood_group, forecast_date);
```

---

## 🔐 Security

- ML endpoints should be protected with authentication
- Admin-only endpoints: `/api/ml/models/{model_key}/reload`
- Rate limiting recommended for prediction endpoints
- Validate all input data before feature engineering

---

## 📝 Next Steps

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run Database Migrations:**
   ```bash
   python migrate_db.py
   ```

3. **Start the Server:**
   ```bash
   python run.py
   ```

4. **Test ML Endpoints:**
   ```bash
   curl http://localhost:5000/api/ml/health
   ```

5. **Start Background Workers:**
   ```bash
   celery -A app.tasks.celery_app worker --loglevel=info
   ```

---

## 📚 Additional Resources

- [Scikit-learn Documentation](https://scikit-learn.org/)
- [LightGBM Documentation](https://lightgbm.readthedocs.io/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)

---

**Built with ❤️ for SmartBlood Connect**
