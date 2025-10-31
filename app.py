"""
Soil Nutrients & Moisture Time Series Prediction API
Using Pre-trained LSTM Models for instant forecasting
Version: 2.1 - Optimized for 4 models (N, P, Moisture, pH)
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

warnings.filterwarnings('ignore')

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ==================== SUPABASE CONFIGURATION ====================
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://kdlhvlpoldivrweyjrfg.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbGh2bHBvbGRpdnJ3ZXlqcmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Njg5MTAsImV4cCI6MjA3NzE0NDkxMH0.7_yB6XjWT5uT7OYIx7CfPMd-3QC1EtcPJmKeoyhFylw')

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Supabase client initialized")
except Exception as e:
    print(f"⚠️  Supabase connection warning: {e}")
    supabase = None

# ==================== CONFIGURATION ====================
INPUT_STEPS = 30
FORECAST_STEPS = 10

# Map model files to parameters
MODEL_MAPPING = {
    'nitrogen': 'models/lstm_soil_nitrogen_model.h5',
    'phosphorus': 'models/lstm_soil_phosphorus_model.h5',
    'moisture': 'models/soil_moisture_lstm_model.h5',
    'pH': 'models/soil_pH_lstm_model.keras'
}

# Map CSV column names to parameters
COLUMN_MAPPING = {
    'nitrogen': 'nitrogen',
    'phosphorus': 'phosphorus',
    'moisture': 'potassium',  # Moisture column maps to potassium in Supabase
    'pH': 'ph'
}

# Parameter display names
PARAM_NAMES = {
    'nitrogen': 'Nitrogen (N)',
    'phosphorus': 'Phosphorus (P)',
    'moisture': 'Soil Moisture (K)',
    'pH': 'Soil pH'
}

# ==================== GLOBAL STATE ====================
MODELS = {}
SCALERS = {}
DATA_CACHE = {}
MODEL_INFO = {}

# ==================== SUPABASE DATA FUNCTIONS ====================
def fetch_sensor_data(limit=500):
    """Fetch latest sensor data from Supabase raw_sensor_readings table"""
    try:
        if not supabase:
            return None
        
        # Fetch latest records ordered by datetime
        response = supabase.table('raw_sensor_readings').select(
            'id, datetime, nitrogen, phosphorus, potassium, ph, temperature, humidity'
        ).order('datetime', desc=False).limit(limit).execute()
        
        if response.data:
            df = pd.DataFrame(response.data)
            # Convert datetime to proper format if needed
            if 'datetime' in df.columns:
                df['datetime'] = pd.to_datetime(df['datetime'])
            return df
        return None
    
    except Exception as e:
        print(f"❌ Error fetching from Supabase: {e}")
        return None

def fit_scalers_from_supabase():
    """Fit scalers using all available Supabase data"""
    global SCALERS
    
    try:
        df = fetch_sensor_data(limit=5000)  # Get more data for better scaling
        if df is None:
            print("⚠️  Could not fit scalers - no data from Supabase")
            return False
        
        for param, col_name in COLUMN_MAPPING.items():
            if col_name in df.columns:
                try:
                    data = df[[col_name]].values.astype(float)
                    scaler = MinMaxScaler(feature_range=(0, 1))
                    scaler.fit(data)
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
    """Load all 4 pre-trained models on startup"""
    global MODELS, MODEL_INFO
    
    print("\n" + "="*70)
    print("🚀 INITIALIZING SOIL PREDICTION ENGINE")
    print("="*70)
    
    for param, model_path in MODEL_MAPPING.items():
        try:
            if os.path.exists(model_path):
                print(f"\n📂 Loading: {param.upper()}")
                print(f"   Path: {model_path}")
                
                # Handle .h5 files with custom_objects to avoid mse deserialization issues
                if model_path.endswith('.h5'):
                    # For .h5 files, load without metrics to avoid deserialization errors
                    model = load_model(model_path, compile=False)
                    # Recompile with standard metrics
                    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
                else:
                    # For .keras files, load normally
                    model = load_model(model_path)
                
                MODELS[param] = model
                
                # Get model info
                file_size = os.path.getsize(model_path) / (1024*1024)
                
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
                MODEL_INFO[param] = {
                    'status': 'not_found',
                    'display_name': PARAM_NAMES[param],
                    'error': f'Model file not found: {model_path}'
                }
                print(f"\n⚠️  {param.upper()}: NOT FOUND")
                print(f"   Expected path: {model_path}")
        
        except Exception as e:
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
    
    # Fit scalers using Supabase data
    print("📊 Fitting scalers from Supabase...")
    if fit_scalers_from_supabase():
        print("✅ Scalers fitted successfully\n")
    else:
        print("⚠️  Scalers could not be fitted\n")

def create_sequences(data, input_steps=INPUT_STEPS):
    """Reshape data into LSTM sequences"""
    if len(data) < input_steps:
        return None
    return data[-input_steps:].reshape(1, input_steps, 1)

def normalize_data(param, data):
    """Normalize data using fitted scaler"""
    if param not in SCALERS:
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaler.fit(data.reshape(-1, 1))
        SCALERS[param] = scaler
    
    return SCALERS[param].transform(data.reshape(-1, 1)).flatten()

def denormalize_data(param, normalized_data):
    """Denormalize predicted data"""
    if param in SCALERS:
        return SCALERS[param].inverse_transform(normalized_data.reshape(-1, 1)).flatten()
    return normalized_data

# ==================== ROUTES ====================

@app.route('/')
def index():
    """Main web interface with API guide"""
    return render_template('index.html')

@app.route('/api/docs')
def api_docs():
    """API Documentation in JSON"""
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
    """Sync data from Supabase and fit scalers"""
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
    """Predict next steps using pre-trained models and Supabase data"""
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
    """Get historical data from Supabase for charting"""
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
    """Get statistics of Supabase data"""
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
    """Get status of all models"""
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
    """Health check endpoint"""
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
    return jsonify({'error': 'Endpoint not found', 'success': False}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error', 'success': False}), 500

# ==================== MAIN ====================
if __name__ == '__main__':
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█" + "  SOIL NUTRIENTS & MOISTURE PREDICTION SYSTEM".center(68) + "█")
    print("█" + "  Version 3.0 - Supabase Integration".center(68) + "█")
    print("█" + " "*68 + "█")
    print("█"*70 + "\n")
    
    load_pretrained_models()
    
    print("🌍 Starting Flask Application")
    print(f"📍 URL: http://localhost:5000")
    print(f"📚 API Docs: http://localhost:5000/api/docs")
    print(f"🎯 Web UI: http://localhost:5000/")
    print(f"🗄️  Data Source: Supabase raw_sensor_readings table")
    print("\n" + "█"*70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
