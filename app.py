"""
Soil Nutrients & Moisture Time Series Prediction API.

This Flask application provides a RESTful API for predicting soil nutrient levels
and moisture using pre-trained LSTM (Long Short-Term Memory) neural network models.
The system integrates with Supabase to fetch real-time sensor data and generates
10-step ahead forecasts for nitrogen, phosphorus, soil moisture, and pH levels.

Version: 3.0 - Supabase Integration
Author: VERDEX Team
License: MIT

Key Features:
    - Pre-trained LSTM models for 4 soil parameters
    - Supabase database integration for real-time data
    - Time series forecasting (10 steps ahead)
    - RESTful API with comprehensive endpoints
    - Web-based dashboard for visualization
    - Automatic data normalization and scaling

Dependencies:
    - Flask: Web framework
    - TensorFlow/Keras: Deep learning models
    - Supabase: Cloud database
    - scikit-learn: Data preprocessing
    - pandas/numpy: Data manipulation
"""

from flask import Flask, render_template, request, jsonify
import tensorflow as tf
from tensorflow.keras.models import load_model
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os
from sklearn.preprocessing import MinMaxScaler
import warnings
import json
from supabase import create_client, Client
from typing import Optional

# Suppress TensorFlow and other library warnings for cleaner output
warnings.filterwarnings('ignore')

# ==================== FLASK APPLICATION SETUP ====================
app = Flask(__name__)

# Configure upload folder for potential file uploads (50MB max)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB limit

# Create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ==================== SUPABASE CONFIGURATION ====================
# Database connection settings - reads from environment variables for security
# Falls back to default values for development (should use env vars in production)
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://kdlhvlpoldivrweyjrfg.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbGh2bHBvbGRpdnJ3ZXlqcmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Njg5MTAsImV4cCI6MjA3NzE0NDkxMH0.7_yB6XjWT5uT7OYIx7CfPMd-3QC1EtcPJmKeoyhFylw')
# Initialize Supabase client with error handling
supabase: Optional[Client] = None
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Supabase client initialized")
except Exception as e:
    print(f"⚠️  Supabase connection warning: {e}")
    supabase = None

# ==================== LSTM MODEL CONFIGURATION ====================
# Number of past time steps required as input for LSTM prediction
INPUT_STEPS = 30

# Number of future time steps to forecast
FORECAST_STEPS = 10

# Mapping of parameter names to their respective trained model files
# Each model is specialized for one soil parameter
MODEL_MAPPING = {
    'nitrogen': 'models/lstm_soil_nitrogen_model.h5',
    'phosphorus': 'models/lstm_soil_phosphorus_model.h5',
    'moisture': 'models/soil_moisture_lstm_model.h5',
    'pH': 'models/soil_pH_lstm_model.keras'
}

# Mapping of internal parameter names to Supabase database column names
# Note: 'moisture' maps to 'potassium' column in the database schema
COLUMN_MAPPING = {
    'nitrogen': 'nitrogen',
    'phosphorus': 'phosphorus',
    'moisture': 'potassium',  # Moisture readings stored in potassium column
    'pH': 'ph'
}

# Human-readable display names for each parameter (used in API responses)
PARAM_NAMES = {
    'nitrogen': 'Nitrogen (N)',
    'phosphorus': 'Phosphorus (P)',
    'moisture': 'Soil Moisture (K)',
    'pH': 'Soil pH'
}

# ==================== GLOBAL STATE ====================
# Dictionary to store loaded Keras/TensorFlow models
MODELS = {}

# Dictionary to store MinMaxScaler objects for data normalization
SCALERS = {}

# Cache for storing fetched sensor data to reduce database calls
DATA_CACHE = {}

# Dictionary containing metadata about loaded models (status, size, etc.)
MODEL_INFO = {}

# ==================== SUPABASE DATA FUNCTIONS ====================
def fetch_sensor_data(limit=500):
    """
    Fetch latest sensor readings from Supabase database.
    
    Retrieves soil sensor data from the 'raw_sensor_readings' table,
    including all relevant parameters (N, P, K, pH, temperature, humidity).
    
    Args:
        limit (int): Maximum number of records to fetch. Default is 500.
                     Use higher values for better scaler fitting.
    
    Returns:
        pd.DataFrame: DataFrame containing sensor readings with proper datetime format.
                      Returns None if Supabase is not configured or query fails.
    
    Note:
        Data is ordered by datetime in ascending order (oldest first).
    """
    try:
        if not supabase:
            return None
        
        # Query Supabase for latest sensor readings
        # Select all relevant columns and order chronologically
        response = supabase.table('raw_sensor_readings').select(
            'id, datetime, nitrogen, phosphorus, potassium, ph, temperature, humidity'
        ).order('datetime', desc=False).limit(limit).execute()
        
        if response.data:
            # Convert response to pandas DataFrame for easier manipulation
            df = pd.DataFrame(response.data)
            
            # Ensure datetime column is in proper pandas datetime format
            if 'datetime' in df.columns:
                df['datetime'] = pd.to_datetime(df['datetime'])
            return df
        return None
    
    except Exception as e:
        print(f"❌ Error fetching from Supabase: {e}")
        return None


def fit_scalers_from_supabase():
    """
    Initialize and fit MinMaxScaler objects using historical data.
    
    Fetches a large dataset from Supabase and fits normalization scalers
    for each soil parameter. Scalers transform data to [0, 1] range,
    which is required for LSTM model input.
    
    Returns:
        bool: True if at least one scaler was successfully fitted,
              False if no data available or all fittings failed.
    
    Side Effects:
        Updates the global SCALERS dictionary with fitted scaler objects.
    
    Note:
        Uses 5000 data points for better statistical representation.
        Individual parameter failures are logged but don't halt the process.
    """
    global SCALERS
    
    try:
        # Fetch larger dataset for more accurate scaling parameters
        df = fetch_sensor_data(limit=5000)
        if df is None:
            print("⚠️  Could not fit scalers - no data from Supabase")
            return False
        
        # Fit a scaler for each parameter
        for param, col_name in COLUMN_MAPPING.items():
            if col_name in df.columns:
                try:
                    # Extract column data as float array
                    data = df[[col_name]].values.astype(float)
                    
                    # Create and fit MinMaxScaler (normalizes to 0-1 range)
                    scaler = MinMaxScaler(feature_range=(0, 1))
                    scaler.fit(data)
                    
                    # Store fitted scaler globally
                    SCALERS[param] = scaler
                    print(f"✅ Scaler fitted for {param}")
                except Exception as e:
                    print(f"⚠️  Could not fit scaler for {param}: {e}")
        
        return len(SCALERS) > 0
    
    except Exception as e:
        print(f"❌ Error fitting scalers: {e}")
        return False

# ==================== MODEL LOADING ====================
def load_pretrained_models():
    """
    Load all pre-trained LSTM models from disk at application startup.
    
    Iterates through MODEL_MAPPING dictionary and loads each Keras model.
    Handles both .h5 (legacy) and .keras (new format) files with appropriate
    loading strategies. Collects metadata about each model for status reporting.
    
    Side Effects:
        - Updates global MODELS dictionary with loaded model objects
        - Updates global MODEL_INFO dictionary with model metadata
        - Calls fit_scalers_from_supabase() to initialize data normalizers
        - Prints detailed loading status to console
    
    Note:
        .h5 files are loaded with compile=False to avoid metric deserialization
        issues, then manually recompiled with standard metrics.
    """
    global MODELS, MODEL_INFO
    
    print("\n" + "="*70)
    print("🚀 INITIALIZING SOIL PREDICTION ENGINE")
    print("="*70)
    
    # Iterate through each configured model
    for param, model_path in MODEL_MAPPING.items():
        try:
            if os.path.exists(model_path):
                print(f"\n📂 Loading: {param.upper()}")
                print(f"   Path: {model_path}")
                
                # Different loading strategies for different file formats
                if model_path.endswith('.h5'):
                    # Legacy HDF5 format: load without metrics to avoid issues
                    model = load_model(model_path, compile=False)
                    # Recompile with standard optimizer and metrics
                    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
                else:
                    # New Keras format: load normally with all metadata
                    model = load_model(model_path)
                
                # Store loaded model in global dictionary
                MODELS[param] = model
                
                # Calculate file size in megabytes
                file_size = os.path.getsize(model_path) / (1024*1024)
                
                # Store model metadata for API endpoints
                MODEL_INFO[param] = {
                    'status': 'loaded',
                    'display_name': PARAM_NAMES[param],
                    'model_file': os.path.basename(model_path),
                    'model_type': model_path.split('.')[-1],
                    'file_size_mb': round(file_size, 2),
                    'loaded_at': datetime.now().isoformat(),
                    'input_steps': INPUT_STEPS,
                    'forecast_steps': FORECAST_STEPS
                }
                
                print(f"   ✅ SUCCESS")
                print(f"   📊 Size: {file_size:.2f} MB")
                print(f"   🔧 Type: {model_path.split('.')[-1].upper()}")
            else:
                # Model file not found - store error info
                MODEL_INFO[param] = {
                    'status': 'not_found',
                    'display_name': PARAM_NAMES[param],
                    'error': f'Model file not found: {model_path}'
                }
                print(f"\n⚠️  {param.upper()}: NOT FOUND")
                print(f"   Expected path: {model_path}")
        
        except Exception as e:
            # Model loading failed - store error info
            MODEL_INFO[param] = {
                'status': 'error',
                'display_name': PARAM_NAMES[param],
                'error': str(e)
            }
            print(f"\n❌ {param.upper()}: ERROR")
            print(f"   {str(e)}")
    
    print("\n" + "="*70)
    print(f"✨ INITIALIZATION COMPLETE: {len(MODELS)}/{len(MODEL_MAPPING)} models loaded")
    print("="*70 + "\n")
    
    # Initialize data scalers using historical data from Supabase
    print("📊 Fitting scalers from Supabase...")
    if fit_scalers_from_supabase():
        print("✅ Scalers fitted successfully\n")
    else:
        print("⚠️  Scalers could not be fitted\n")

def create_sequences(data, input_steps=INPUT_STEPS):
    """
    Reshape 1D time series data into LSTM-compatible 3D sequences.
    
    LSTM models require input in shape (batch_size, time_steps, features).
    This function takes the last N data points and reshapes them accordingly.
    
    Args:
        data (np.ndarray): 1D array of time series values
        input_steps (int): Number of time steps to use (default: INPUT_STEPS=30)
    
    Returns:
        np.ndarray: Reshaped array of shape (1, input_steps, 1) for LSTM input
        None: If insufficient data points available
    """
    if len(data) < input_steps:
        return None
    # Take last N points and reshape to (1, N, 1)
    return data[-input_steps:].reshape(1, input_steps, 1)


def normalize_data(param, data):
    """
    Normalize data to [0, 1] range using parameter-specific scaler.
    
    LSTM models perform better with normalized inputs. This function uses
    a pre-fitted MinMaxScaler for the parameter. If no scaler exists,
    creates and fits a new one using the provided data.
    
    Args:
        param (str): Parameter name ('nitrogen', 'phosphorus', 'moisture', 'pH')
        data (np.ndarray): Raw data values to normalize
    
    Returns:
        np.ndarray: Normalized data in [0, 1] range (flattened 1D array)
    
    Side Effects:
        May update global SCALERS dictionary if scaler doesn't exist.
    """
    if param not in SCALERS:
        # No scaler exists - create and fit one with current data
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaler.fit(data.reshape(-1, 1))
        SCALERS[param] = scaler
    
    # Transform data using fitted scaler and flatten to 1D
    return SCALERS[param].transform(data.reshape(-1, 1)).flatten()


def denormalize_data(param, normalized_data):
    """
    Convert normalized predictions back to original scale.
    
    Inverse transform model predictions from [0, 1] range back to
    actual parameter values using the parameter's fitted scaler.
    
    Args:
        param (str): Parameter name to get appropriate scaler
        normalized_data (np.ndarray): Normalized predictions from model
    
    Returns:
        np.ndarray: Data in original scale (flattened 1D array)
                    Returns input unchanged if no scaler available
    """
    if param in SCALERS:
        # Use inverse transform to restore original scale
        return SCALERS[param].inverse_transform(normalized_data.reshape(-1, 1)).flatten()
    return normalized_data

# ==================== FLASK ROUTES ====================

@app.route('/')
def index():
    """
    Render the main web dashboard.
    
    Serves the HTML interface that provides:
    - Interactive prediction dashboard
    - Data visualization charts
    - API documentation
    - Model status monitoring
    
    Returns:
        str: Rendered HTML template
    """
    return render_template('index.html')


@app.route('/api/docs')
def api_docs():
    """
    Provide comprehensive API documentation in JSON format.
    
    Returns structured information about all available endpoints,
    request parameters, response formats, and model status.
    
    Returns:
        tuple: (JSON response, HTTP status 200)
               Contains application metadata and endpoint documentation
    """
    return jsonify({
        'application': 'Soil Nutrients & Moisture Time Series Prediction API',
        'version': '2.1',
        'description': 'Pre-trained LSTM models for instant soil parameter forecasting',
        'base_url': 'http://localhost:5000',
        'models': {
            'nitrogen': {'file': 'lstm_soil_nitrogen_model.h5', 'status': MODEL_INFO.get('nitrogen', {}).get('status', 'unknown')},
            'phosphorus': {'file': 'lstm_soil_phosphorus_model.h5', 'status': MODEL_INFO.get('phosphorus', {}).get('status', 'unknown')},
            'moisture': {'file': 'soil_moisture_lstm_model.h5', 'status': MODEL_INFO.get('moisture', {}).get('status', 'unknown')},
            'pH': {'file': 'soil_pH_lstm_model.keras', 'status': MODEL_INFO.get('pH', {}).get('status', 'unknown')}
        },
        'endpoints': {
            '/api/health': {
                'method': 'GET',
                'description': 'Health check',
                'returns': 'Status and models loaded'
            },
            '/api/upload': {
                'method': 'POST',
                'description': 'Upload CSV with soil data',
                'parameters': {
                    'file': 'CSV file (required)',
                    'required_columns': ['N', 'P', 'K', 'pH']
                },
                'returns': 'Upload status and data info'
            },
            '/api/predict': {
                'method': 'POST',
                'description': 'Predict next 10 steps for all parameters',
                'parameters': 'JSON body (optional: specific parameter)',
                'returns': 'Predictions with forecasts and statistics'
            },
            '/api/historical': {
                'method': 'GET',
                'description': 'Get historical data for visualization',
                'parameters': {
                    'parameter': 'nitrogen|phosphorus|moisture|pH (required)',
                    'limit': 'Number of past points (default: 100)'
                },
                'returns': 'Time series values and timestamps'
            },
            '/api/data-info': {
                'method': 'GET',
                'description': 'Get uploaded data statistics',
                'returns': 'Data statistics for N, P, K, pH'
            },
            '/api/model-status': {
                'method': 'GET',
                'description': 'Get status of all models',
                'returns': 'Model info and loading status'
            }
        }
    }), 200

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Synchronize sensor data from Supabase database.
    
    Endpoint to manually trigger data synchronization from the Supabase
    'raw_sensor_readings' table. Validates data structure and caches
    results for prediction endpoints.
    
    Method: POST
    
    Returns:
        tuple: (JSON response, HTTP status code)
               Success (200): Contains row count, columns, date range
               Error (400/500): Contains error message
    
    Response Format:
        {
            "success": bool,
            "message": str,
            "data": {
                "rows": int,
                "columns": list,
                "date_range": dict
            }
        }
    """
    try:
        if not supabase:
            return jsonify({
                'error': 'Supabase not configured',
                'success': False
            }), 500
        
        # Fetch latest data from Supabase
        df = fetch_sensor_data(limit=1000)
        
        if df is None or len(df) == 0:
            return jsonify({
                'error': 'No data available in Supabase',
                'success': False
            }), 400
        
        # Validate required columns
        required_cols = ['nitrogen', 'phosphorus', 'potassium', 'ph']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            return jsonify({
                'error': f'Missing columns: {missing_cols}',
                'available_columns': df.columns.tolist(),
                'success': False
            }), 400
        
        # Check minimum data points
        if len(df) < INPUT_STEPS:
            return jsonify({
                'error': f'Insufficient data points. Need at least {INPUT_STEPS}, got {len(df)}',
                'success': False
            }), 400
        
        # Cache the data
        DATA_CACHE['df'] = df
        DATA_CACHE['sync_time'] = datetime.now().isoformat()
        DATA_CACHE['source'] = 'supabase'
        
        return jsonify({
            'success': True,
            'message': f'✅ Synced {len(df)} data points from Supabase',
            'data': {
                'rows': len(df),
                'columns': df.columns.tolist(),
                'date_range': {
                    'start': str(df['datetime'].min()) if 'datetime' in df.columns else 'N/A',
                    'end': str(df['datetime'].max()) if 'datetime' in df.columns else 'N/A'
                }
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Generate 10-step ahead forecasts for all soil parameters.
    
    Main prediction endpoint that:
    1. Fetches latest data from Supabase
    2. Normalizes data using fitted scalers
    3. Creates LSTM input sequences (last 30 points)
    4. Generates predictions using trained models
    5. Denormalizes and calculates statistics
    
    Method: POST
    
    Returns:
        tuple: (JSON response, HTTP status code)
               Success (200): Complete predictions with statistics
               Error (400/500): Error message
    
    Response Format:
        {
            "success": bool,
            "timestamp": str (ISO format),
            "data_points": int,
            "predictions": {
                "nitrogen": {
                    "current_value": float,
                    "forecast": [float, ...],  # 10 values
                    "statistics": {
                        "mean": float,
                        "min": float,
                        "max": float,
                        "std": float,
                        "trend": str
                    }
                },
                ... (phosphorus, moisture, pH)
            }
        }
    """
    try:
        if not supabase:
            return jsonify({
                'error': 'Supabase not configured',
                'success': False
            }), 500
        
        if len(MODELS) == 0:
            return jsonify({
                'error': 'No models loaded. Check model files.',
                'success': False
            }), 500
        
        # Fetch latest data from Supabase
        df = fetch_sensor_data(limit=500)
        
        if df is None or len(df) == 0:
            return jsonify({
                'error': 'No data available in Supabase',
                'success': False
            }), 400
        
        predictions = {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'data_points': len(df),
            'input_steps': INPUT_STEPS,
            'forecast_steps': FORECAST_STEPS,
            'data_source': 'supabase',
            'predictions': {}
        }
        
        # Make predictions for each parameter
        for param, col_name in COLUMN_MAPPING.items():
            if col_name not in df.columns or param not in MODELS:
                predictions['predictions'][param] = {
                    'error': f'Data or model not found for {param}'
                }
                continue
            
            try:
                # Get raw data
                raw_data = df[[col_name]].values.astype(float).flatten()
                
                # Normalize
                normalized_data = normalize_data(param, raw_data)
                
                # Create sequence
                sequence = create_sequences(normalized_data)
                if sequence is None:
                    predictions['predictions'][param] = {
                        'error': 'Insufficient data for sequence'
                    }
                    continue
                
                # Model prediction
                model = MODELS[param]
                forecast_normalized = model.predict(sequence, verbose=0)
                forecast_normalized = forecast_normalized[0].flatten()
                
                # Denormalize
                forecast = denormalize_data(param, forecast_normalized)
                
                # Extract relevant values
                current_value = float(raw_data[-1])
                forecast_values = [float(v) for v in forecast[:FORECAST_STEPS]]
                
                # Calculate statistics
                forecast_array = np.array(forecast_values)
                trend_direction = "📈 Increasing" if forecast_values[-1] > current_value else "📉 Decreasing"
                trend_strength = abs(forecast_values[-1] - current_value) / max(current_value, 1)
                
                predictions['predictions'][param] = {
                    'status': 'success',
                    'display_name': PARAM_NAMES[param],
                    'current_value': round(current_value, 3),
                    'forecast': [round(v, 3) for v in forecast_values],
                    'statistics': {
                        'mean': round(float(np.mean(forecast_array)), 3),
                        'min': round(float(np.min(forecast_array)), 3),
                        'max': round(float(np.max(forecast_array)), 3),
                        'std': round(float(np.std(forecast_array)), 3),
                        'range': round(float(np.max(forecast_array) - np.min(forecast_array)), 3),
                        'trend': trend_direction,
                        'trend_strength': round(trend_strength, 2)
                    }
                }
            
            except Exception as e:
                predictions['predictions'][param] = {
                    'status': 'error',
                    'display_name': PARAM_NAMES[param],
                    'error': str(e)
                }
        
        return jsonify(predictions), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/historical', methods=['GET'])
def get_historical():
    """
    Retrieve historical time series data for visualization.
    
    Fetches past sensor readings from Supabase for a specific parameter.
    Used by the frontend charting component to display trends.
    
    Method: GET
    
    Query Parameters:
        parameter (str): Parameter name (nitrogen|phosphorus|moisture|pH)
                        Default: 'nitrogen'
        limit (int): Maximum number of data points to return
                    Default: 100
    
    Returns:
        tuple: (JSON response, HTTP status code)
               Success (200): Time series values and indices
               Error (404/500): Error message
    
    Response Format:
        {
            "success": bool,
            "parameter": str,
            "display_name": str,
            "values": [float, ...],
            "indices": [int, ...],
            "returned_rows": int
        }
    """
    try:
        if not supabase:
            return jsonify({
                'error': 'Supabase not configured',
                'success': False
            }), 500
        
        param = request.args.get('parameter', 'nitrogen')
        limit = request.args.get('limit', 100, type=int)
        
        # Fetch from Supabase
        df = fetch_sensor_data(limit=limit * 2)  # Fetch extra to ensure we have enough after sorting
        
        if df is None or len(df) == 0:
            return jsonify({
                'error': 'No data available in Supabase',
                'success': False
            }), 404
        
        # Map parameter name to column
        col_mapping = {
            'nitrogen': 'nitrogen', 'N': 'nitrogen',
            'phosphorus': 'phosphorus', 'P': 'phosphorus',
            'potassium': 'potassium', 'K': 'potassium', 'moisture': 'potassium',
            'pH': 'ph', 'ph': 'ph'
        }
        col_name = col_mapping.get(param, COLUMN_MAPPING.get(param, 'nitrogen'))
        
        if col_name not in df.columns:
            return jsonify({
                'error': f'Column {col_name} not found',
                'success': False
            }), 404
        
        # Get last N values
        hist_df = df.tail(limit).copy()
        
        # Reset index to sequential
        hist_df = hist_df.reset_index(drop=True)
        
        return jsonify({
            'success': True,
            'parameter': param,
            'display_name': PARAM_NAMES.get(param, param),
            'limit': limit,
            'total_rows': len(df),
            'returned_rows': len(hist_df),
            'values': hist_df[col_name].values.tolist(),
            'indices': list(range(len(hist_df)))
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/data-info', methods=['GET'])
def data_info():
    """
    Retrieve statistical summary of sensor data.
    
    Calculates descriptive statistics (mean, std, min, max) for all
    soil parameters from the Supabase database. Useful for understanding
    data distribution and current state.
    
    Method: GET
    
    Returns:
        tuple: (JSON response, HTTP status code)
               Success (200): Statistics for all parameters
               Error (400/500): Error message
    
    Response Format:
        {
            "success": bool,
            "total_rows": int,
            "columns": [str, ...],
            "source": "supabase",
            "statistics": {
                "nitrogen": {
                    "mean": float,
                    "std": float,
                    "min": float,
                    "max": float,
                    "current": float
                },
                ... (phosphorus, moisture, pH)
            }
        }
    """
    try:
        if not supabase:
            return jsonify({
                'error': 'Supabase not configured',
                'success': False
            }), 500
        
        # Fetch data from Supabase
        df = fetch_sensor_data(limit=5000)
        
        if df is None or len(df) == 0:
            return jsonify({
                'error': 'No data available in Supabase',
                'success': False
            }), 400
        
        info = {
            'success': True,
            'total_rows': len(df),
            'columns': df.columns.tolist(),
            'sync_time': datetime.now().isoformat(),
            'source': 'supabase',
            'statistics': {}
        }
        
        # Stats for each nutrient
        for param, col_name in COLUMN_MAPPING.items():
            if col_name in df.columns:
                data = df[col_name].astype(float)
                info['statistics'][param] = {
                    'display_name': PARAM_NAMES[param],
                    'column': col_name,
                    'count': len(data),
                    'mean': round(float(data.mean()), 3),
                    'std': round(float(data.std()), 3),
                    'min': round(float(data.min()), 3),
                    'max': round(float(data.max()), 3),
                    'current': round(float(data.iloc[-1]), 3)
                }
        
        return jsonify(info), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/model-status', methods=['GET'])
def model_status():
    """
    Report loading status and metadata for all LSTM models.
    
    Provides comprehensive information about each model including
    file paths, loading status, file sizes, and configuration parameters.
    Used by frontend to display model health status.
    
    Method: GET
    
    Returns:
        tuple: (JSON response, HTTP status 200)
    
    Response Format:
        {
            "success": bool,
            "total_models": int,
            "loaded_models": int,
            "app_version": str,
            "input_steps": int,
            "forecast_steps": int,
            "models": {
                "nitrogen": {
                    "status": str (loaded|not_found|error),
                    "model_file": str,
                    "file_size_mb": float,
                    "loaded_at": str (ISO timestamp)
                },
                ... (other parameters)
            }
        }
    """
    return jsonify({
        'success': True,
        'total_models': len(MODEL_MAPPING),
        'loaded_models': len(MODELS),
        'models': MODEL_INFO,
        'app_version': '2.1',
        'app_mode': 'Pre-trained LSTM Models',
        'input_steps': INPUT_STEPS,
        'forecast_steps': FORECAST_STEPS
    }), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Perform application health check.
    
    Quick diagnostic endpoint to verify:
    - Flask application is running
    - Models are loaded
    - Scalers are fitted
    - Supabase connection is active
    
    Method: GET
    
    Returns:
        tuple: (JSON response, HTTP status 200)
    
    Response Format:
        {
            "success": bool,
            "status": str (healthy|degraded),
            "version": str,
            "app_mode": str,
            "models_loaded": int,
            "scalers_fit": int,
            "supabase_connected": bool,
            "timestamp": str (ISO format)
        }
    
    Note:
        Status is 'healthy' if models loaded, 'degraded' otherwise.
    """
    return jsonify({
        'success': True,
        'status': 'healthy' if len(MODELS) > 0 else 'degraded',
        'version': '3.0',
        'app_mode': 'Pre-trained Models + Supabase',
        'models_loaded': len(MODELS),
        'scalers_fit': len(SCALERS),
        'supabase_connected': supabase is not None,
        'timestamp': datetime.now().isoformat()
    }), 200

# ==================== ERROR HANDLERS ====================
@app.errorhandler(404)
def not_found(error):
    """
    Handle 404 Not Found errors.
    
    Returns JSON error response for invalid endpoints.
    
    Args:
        error: Flask error object (unused)
    
    Returns:
        tuple: (JSON error response, HTTP status 404)
    """
    return jsonify({'error': 'Endpoint not found', 'success': False}), 404


@app.errorhandler(500)
def server_error(error):
    """
    Handle 500 Internal Server Error.
    
    Catches unhandled exceptions and returns JSON error response.
    
    Args:
        error: Flask error object (unused)
    
    Returns:
        tuple: (JSON error response, HTTP status 500)
    """
    return jsonify({'error': 'Internal server error', 'success': False}), 500

# ==================== APPLICATION ENTRY POINT ====================
if __name__ == '__main__':
    """
    Main entry point for the Flask application.
    
    Workflow:
    1. Display startup banner with version info
    2. Load all pre-trained LSTM models
    3. Fit data scalers from Supabase
    4. Start Flask development server
    
    Server Configuration:
    - Debug mode: Enabled (shows detailed errors)
    - Host: 0.0.0.0 (accessible from network)
    - Port: 5000 (default Flask port)
    - Reloader: Disabled (prevents double model loading)
    
    Note:
        For production deployment, use a production WSGI server
        like Gunicorn instead of Flask's built-in server.
        Example: gunicorn -w 4 -b 0.0.0.0:5000 app:app
    """
    # Display startup banner
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█" + "  SOIL NUTRIENTS & MOISTURE PREDICTION SYSTEM".center(68) + "█")
    print("█" + "  Version 3.0 - Supabase Integration".center(68) + "█")
    print("█" + " "*68 + "█")
    print("█"*70 + "\n")
    
    # Initialize models and scalers
    load_pretrained_models()
    
    # Display access information
    print("🌍 Starting Flask Application")
    print(f"📍 URL: http://localhost:5000")
    print(f"📚 API Docs: http://localhost:5000/api/docs")
    print(f"🎯 Web UI: http://localhost:5000/")
    print(f"🗄️  Data Source: Supabase raw_sensor_readings table")
    print("\n" + "█"*70 + "\n")
    
    # Start Flask development server
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
