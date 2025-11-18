# VERDEX 🌱

**Soil Nutrients & Moisture Time Series Prediction System**

An AI-powered Flask application that uses pre-trained LSTM (Long Short-Term Memory) neural networks to forecast soil nutrient levels and moisture content. The system integrates with Supabase for real-time sensor data and provides a comprehensive RESTful API with an interactive web dashboard.

![Version](https://img.shields.io/badge/version-3.0-blue)
![Python](https://img.shields.io/badge/python-3.11-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 🎯 Features

- **Pre-trained LSTM Models**: Four specialized models for nitrogen, phosphorus, moisture, and pH prediction
- **10-Step Ahead Forecasting**: Predict next 10 time steps for each parameter
- **Supabase Integration**: Real-time data synchronization from cloud database
- **RESTful API**: Comprehensive endpoints for predictions, historical data, and statistics
- **Interactive Dashboard**: Web-based UI with real-time charts and visualizations
- **Automatic Scaling**: MinMaxScaler normalization for optimal model performance
- **Health Monitoring**: Built-in health checks and model status reporting

---

## 📋 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Models](#-models)
- [Usage Examples](#-usage-examples)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🚀 Installation

### Prerequisites

- Python 3.11
- pip or uv (recommended)
- Supabase account (for data storage)

### Option 1: Using UV (Recommended)

```powershell
# Clone the repository
git clone https://github.com/frankmathewsajan/verdex.git
cd verdex

# Create virtual environment with uv
uv venv

# Activate virtual environment
.venv\Scripts\Activate.ps1  # PowerShell
# or
.venv\Scripts\activate.bat  # CMD

# Install dependencies
uv pip sync
```

### Option 2: Using pip

```powershell
# Clone the repository
git clone https://github.com/frankmathewsajan/verdex.git
cd verdex

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\Activate.ps1  # PowerShell

# Install dependencies
pip install -r requirements.txt
```

---

## ⚡ Quick Start

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-api-key
```

### 2. Ensure Models are Present

Make sure these model files exist in the `models/` directory:
- `lstm_soil_nitrogen_model.h5`
- `lstm_soil_phosphorus_model.h5`
- `soil_moisture_lstm_model.h5`
- `soil_pH_lstm_model.keras`

### 3. Start the Application

```powershell
python app.py
```

The server will start on `http://localhost:5000`

### 4. Access the Dashboard

Open your browser and navigate to:
- **Web Dashboard**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api/docs
- **Health Check**: http://localhost:5000/api/health

---

## 📁 Project Structure

```
verdex/
├── app.py                      # Main Flask application
├── main.py                     # CLI entry point (placeholder)
├── pyproject.toml             # Project dependencies (uv)
├── requirements.txt           # Project dependencies (pip)
├── .python-version            # Python version specification
├── README.md                  # This file
├── .env                       # Environment variables (create this)
│
├── models/                    # Pre-trained LSTM models
│   ├── lstm_soil_nitrogen_model.h5
│   ├── lstm_soil_phosphorus_model.h5
│   ├── soil_moisture_lstm_model.h5
│   └── soil_pH_lstm_model.keras
│
├── templates/                 # HTML templates
│   └── index.html            # Web dashboard
│
└── .venv/                    # Virtual environment (auto-generated)
```

---

## ⚙️ Configuration

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Create a table named `raw_sensor_readings` with the following schema:

```sql
CREATE TABLE raw_sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    datetime TIMESTAMP WITH TIME ZONE,
    nitrogen FLOAT,
    phosphorus FLOAT,
    potassium FLOAT,  -- Used for moisture readings
    ph FLOAT,
    temperature FLOAT,
    humidity FLOAT
);
```

3. Add your Supabase URL and API key to `.env` file

### Model Configuration

Edit `app.py` to modify model parameters:

```python
INPUT_STEPS = 30        # Number of past time steps for prediction
FORECAST_STEPS = 10     # Number of future steps to forecast
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000
```

### Endpoints

#### 1. Health Check
```http
GET /api/health
```

**Response:**
```json
{
    "success": true,
    "status": "healthy",
    "version": "3.0",
    "models_loaded": 4,
    "scalers_fit": 4,
    "supabase_connected": true,
    "timestamp": "2025-11-18T10:30:00"
}
```

#### 2. Sync Data from Supabase
```http
POST /api/upload
```

**Response:**
```json
{
    "success": true,
    "message": "✅ Synced 500 data points from Supabase",
    "data": {
        "rows": 500,
        "columns": ["id", "datetime", "nitrogen", ...],
        "date_range": {
            "start": "2025-01-01T00:00:00",
            "end": "2025-11-18T10:30:00"
        }
    }
}
```

#### 3. Make Predictions
```http
POST /api/predict
```

**Response:**
```json
{
    "success": true,
    "timestamp": "2025-11-18T10:30:00",
    "data_points": 500,
    "input_steps": 30,
    "forecast_steps": 10,
    "predictions": {
        "nitrogen": {
            "current_value": 45.3,
            "forecast": [45.5, 45.7, 45.9, ...],
            "statistics": {
                "mean": 45.8,
                "min": 45.3,
                "max": 46.2,
                "std": 0.3,
                "trend": "📈 Increasing"
            }
        }
    }
}
```

#### 4. Get Historical Data
```http
GET /api/historical?parameter=nitrogen&limit=100
```

**Parameters:**
- `parameter`: nitrogen|phosphorus|moisture|pH (default: nitrogen)
- `limit`: Number of data points (default: 100)

**Response:**
```json
{
    "success": true,
    "parameter": "nitrogen",
    "display_name": "Nitrogen (N)",
    "values": [45.1, 45.3, 45.5, ...],
    "indices": [0, 1, 2, ...],
    "returned_rows": 100
}
```

#### 5. Get Data Statistics
```http
GET /api/data-info
```

**Response:**
```json
{
    "success": true,
    "total_rows": 500,
    "statistics": {
        "nitrogen": {
            "mean": 45.5,
            "std": 2.3,
            "min": 40.0,
            "max": 50.0,
            "current": 45.3
        }
    }
}
```

#### 6. Get Model Status
```http
GET /api/model-status
```

**Response:**
```json
{
    "success": true,
    "total_models": 4,
    "loaded_models": 4,
    "models": {
        "nitrogen": {
            "status": "loaded",
            "model_file": "lstm_soil_nitrogen_model.h5",
            "file_size_mb": 2.45,
            "loaded_at": "2025-11-18T10:00:00"
        }
    }
}
```

---

## 🤖 Models

### Model Architecture

Each LSTM model is trained to predict one soil parameter:

- **Input Shape**: (30, 1) - Last 30 time steps
- **Output Shape**: (10,) - Next 10 time steps
- **Normalization**: MinMaxScaler (0-1 range)
- **Architecture**: Multi-layer LSTM with dropout

### Parameters

| Parameter | Model File | Unit | Description |
|-----------|-----------|------|-------------|
| Nitrogen (N) | `lstm_soil_nitrogen_model.h5` | mg/kg | Soil nitrogen content |
| Phosphorus (P) | `lstm_soil_phosphorus_model.h5` | mg/kg | Soil phosphorus content |
| Moisture | `soil_moisture_lstm_model.h5` | % | Soil moisture percentage |
| pH | `soil_pH_lstm_model.keras` | pH | Soil acidity/alkalinity |

### Model Training Requirements

To train new models, you need:
- Minimum 1000 data points
- Sequential time series data
- Consistent sampling intervals
- Normalized data (handled automatically)

---

## 💡 Usage Examples

### Python API Client

```python
import requests

# Base URL
BASE_URL = "http://localhost:5000"

# Sync data
response = requests.post(f"{BASE_URL}/api/upload")
print(response.json())

# Make predictions
response = requests.post(f"{BASE_URL}/api/predict")
predictions = response.json()

# Get nitrogen forecast
nitrogen_forecast = predictions["predictions"]["nitrogen"]["forecast"]
print(f"Next 10 nitrogen values: {nitrogen_forecast}")

# Get historical data
response = requests.get(f"{BASE_URL}/api/historical?parameter=pH&limit=50")
historical = response.json()
print(f"Historical pH values: {historical['values']}")
```

### cURL Examples

```bash
# Health check
curl http://localhost:5000/api/health

# Sync data
curl -X POST http://localhost:5000/api/upload

# Make predictions
curl -X POST http://localhost:5000/api/predict

# Get historical data
curl "http://localhost:5000/api/historical?parameter=nitrogen&limit=100"

# Get statistics
curl http://localhost:5000/api/data-info
```

### PowerShell Examples

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:5000/api/health"

# Make predictions
Invoke-RestMethod -Uri "http://localhost:5000/api/predict" -Method POST

# Get historical data
$params = @{
    parameter = "nitrogen"
    limit = 100
}
Invoke-RestMethod -Uri "http://localhost:5000/api/historical" -Body $params
```

---

## 🔧 Development

### Running in Development Mode

```powershell
# With debug enabled (default)
python app.py

# Production mode with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Code Style

This project follows:
- **PEP 8**: Python style guide
- **PEP 257**: Docstring conventions
- **Type hints**: Where applicable
- **Comprehensive comments**: All functions documented

### Testing

```powershell
# Test health endpoint
curl http://localhost:5000/api/health

# Test prediction workflow
curl -X POST http://localhost:5000/api/upload
curl -X POST http://localhost:5000/api/predict
```

---

## 🐛 Troubleshooting

### Models Not Loading

**Issue**: `⚠️ Model not found`

**Solution**: 
- Ensure all model files are in the `models/` directory
- Check file permissions
- Verify file extensions (.h5 or .keras)

### Supabase Connection Error

**Issue**: `⚠️ Supabase connection warning`

**Solution**:
- Verify `.env` file contains correct credentials
- Check Supabase project is active
- Ensure API key has proper permissions

### Insufficient Data Points

**Issue**: `Insufficient data points. Need at least 30`

**Solution**:
- Add more data to Supabase table
- Reduce `INPUT_STEPS` in configuration (not recommended)
- Check data is being fetched correctly

### Scaler Fitting Failed

**Issue**: `⚠️ Could not fit scalers`

**Solution**:
- Ensure Supabase connection is working
- Verify data table has numeric values
- Check column names match `COLUMN_MAPPING`

---

## 📝 License

This project is licensed under the MIT License.

---

## 👥 Authors

- **Frank Mathew Sajan** - [@frankmathewsajan](https://github.com/frankmathewsajan)

---

## 🙏 Acknowledgments

- TensorFlow/Keras for deep learning framework
- Supabase for database infrastructure
- Flask for web framework
- Chart.js for data visualization

---

## 📧 Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Contact: [Your Email]

---

**Made with ❤️ by the VERDEX Team**
