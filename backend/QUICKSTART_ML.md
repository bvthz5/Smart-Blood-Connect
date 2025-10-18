# SmartBlood ML Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Verify Models Exist
```bash
ls models_artifacts/
# Should show:
# - donor_seeker_model.pkl
# - donor_availability.pkl
# - donor_response_time_model.pkl
# - donor_reliability_model.pkl
# - kerala_demand_forecast_stacked_optuna.pkl
# - model_map.json
```

### 3. Update Database Schema
```bash
python migrate_db.py
```

This creates the new ML tables:
- `model_artifacts`
- `match_predictions`
- `demand_forecasts`
- `model_prediction_logs`

### 4. Start the Server
```bash
python run.py
```

### 5. Test ML Endpoints
```bash
# Health check
curl http://localhost:5000/api/ml/health

# Expected response:
{
  "status": "healthy",
  "models_available": 5,
  "models": ["donor_seeker_match", "donor_availability", ...]
}
```

---

## 🧪 Test Donor Matching

### Create a Test Request
First, create a blood request via the admin panel or API.

### Match Donors
```bash
curl -X POST http://localhost:5000/api/ml/match \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": 1,
    "top_k": 5,
    "save_predictions": true
  }'
```

### Expected Response
```json
{
  "request_id": 1,
  "matches": [
    {
      "donor_id": 1,
      "donor_name": "John Doe",
      "match_score": 0.95,
      "availability_score": 0.88,
      "response_time_hours": 2.5,
      "reliability_score": 0.92,
      "distance_km": 5.2,
      "blood_group": "O+",
      "rank": 1
    }
  ],
  "total_candidates": 10,
  "inference_time_ms": 125.3
}
```

---

## 🔄 Optional: Background Tasks

### Install Redis (Required for Celery)
```bash
# Windows (using Chocolatey)
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases

# Start Redis
redis-server
```

### Start Celery Worker
```bash
# In a new terminal
celery -A celery_worker.celery_app worker --loglevel=info -Q ml_queue,default
```

### Start Celery Beat (Scheduler)
```bash
# In another terminal
celery -A celery_worker.celery_app beat --loglevel=info
```

---

## 📊 View Predictions in Database

```sql
-- View recent match predictions
SELECT 
    mp.request_id,
    mp.donor_id,
    mp.match_score,
    mp.rank,
    mp.created_at
FROM match_predictions mp
ORDER BY mp.created_at DESC
LIMIT 10;

-- View prediction logs
SELECT 
    model_name,
    inference_time_ms,
    success,
    created_at
FROM model_prediction_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ml/health` | GET | Check ML service status |
| `/api/ml/match` | POST | Find matching donors |
| `/api/ml/predict_availability` | POST | Predict donor availability |
| `/api/ml/models` | GET | List all models |
| `/api/ml/predictions/history` | GET | View prediction history |

---

## 🐛 Troubleshooting

### Models Not Loading
**Error:** `[ML] Model initialization error`

**Solution:**
1. Check `models_artifacts/` exists
2. Verify all `.pkl` files are present
3. Check `model_map.json` is valid JSON

### Import Errors
**Error:** `ModuleNotFoundError: No module named 'sklearn'`

**Solution:**
```bash
pip install -r requirements.txt
```

### Database Errors
**Error:** `relation "match_predictions" does not exist`

**Solution:**
```bash
python migrate_db.py
```

### Slow Predictions
**Issue:** Predictions take > 5 seconds

**Solution:**
- Models are loaded on first use
- Subsequent predictions will be faster
- Critical models are preloaded at startup

---

## 📈 Performance Tips

1. **Preload Models:** Critical models load automatically at startup
2. **Cache Results:** Predictions are saved to database
3. **Batch Requests:** Process multiple donors in one request
4. **Index Database:** Ensure proper indexes on foreign keys

---

## 🔐 Production Checklist

- [ ] Add authentication to ML endpoints
- [ ] Set up rate limiting
- [ ] Configure Redis for production
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Enable HTTPS
- [ ] Configure proper logging
- [ ] Set up database backups
- [ ] Test with production data

---

## 📚 Next Steps

1. Read full documentation: `ML_INTEGRATION_GUIDE.md`
2. Explore API endpoints: `http://localhost:5000/apidocs`
3. Set up background tasks (Celery)
4. Configure monitoring and alerts
5. Test with real data

---

## 🆘 Need Help?

- Check logs: `backend/logs/`
- Review documentation: `ML_INTEGRATION_GUIDE.md`
- Test endpoints: `http://localhost:5000/apidocs`

---

**Happy Coding! 🩸**
