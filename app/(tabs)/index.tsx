import GoogleMap from '@/components/google-map';
import { useAuth } from '@/contexts/auth-context';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { useTheme } from '@/contexts/theme-context';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Line, Path, Svg } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const MAX_LIVE_DATA_POINTS = 300; // Increased from 20 to 300 for better trends

interface PredictionData {
  display_name: string;
  current_value: number | null;
  forecast: number[];
  statistics: {
    max: number | null;
    mean: number | null;
    min: number | null;
    range: number | null;
    std: number | null;
    trend: string | null;
    trend_strength: number | null;
  };
  status: string | null;
}

interface PredictionResponse {
  cleaned: {
    success: boolean;
    timestamp: string;
    data_points: number | null;
    data_source: string | null;
    input_steps: number | null;
    forecast_steps: number | null;
    predictions: {
      nitrogen?: PredictionData;
      phosphorus?: PredictionData;
      potassium?: PredictionData;
      ph?: PredictionData;
    };
  };
}

type NutrientType = 'nitrogen' | 'phosphorus' | 'potassium' | 'ph';

interface LiveDataPoint {
  timestamp: number;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  pH: number | null;
}

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const { latestSensorData, isConnected, isDataValid } = useBluetooth();
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientType>('nitrogen');
  const [predictionFailCount, setPredictionFailCount] = useState(0);
  const [predictionDisabled, setPredictionDisabled] = useState(false);
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([]);
  const [latestDbReading, setLatestDbReading] = useState<{
    nitrogen: number | null;
    phosphorus: number | null;
    potassium: number | null;
    pH: number | null;
  } | null>(null);
  const [mapLocations, setMapLocations] = useState<Array<{
    latitude: number;
    longitude: number;
    isLive: boolean;
  }>>([]);

  // Fetch map locations from database
  const fetchMapLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('sensor_readings')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50); // Get last 50 locations

      if (fetchError) {
        console.error('Error fetching map locations:', fetchError);
        return;
      }

      if (data) {
        const locations = data.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          isLive: false,
        }));

        // Add current live location if connected
        if (isConnected && latestSensorData && latestSensorData.latitude && latestSensorData.longitude) {
          locations.unshift({
            latitude: latestSensorData.latitude,
            longitude: latestSensorData.longitude,
            isLive: true,
          });
        }

        setMapLocations(locations);
      }
    } catch (err) {
      console.error('Error in fetchMapLocations:', err);
    }
  };

  // Fetch latest reading from database when not connected
  const fetchLatestReading = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('sensor_readings')
        .select('nitrogen, phosphorus, potassium, ph')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error('Error fetching latest reading:', fetchError);
        return;
      }

      if (data) {
        setLatestDbReading({
          nitrogen: data.nitrogen,
          phosphorus: data.phosphorus,
          potassium: data.potassium,
          pH: data.ph,
        });
      }
    } catch (err) {
      console.error('Error in fetchLatestReading:', err);
    }
  };

  // Fetch latest reading when not connected
  useEffect(() => {
    if (!isConnected) {
      fetchLatestReading();
    }
  }, [isConnected]);

  // Fetch map locations on mount and when connection changes
  useEffect(() => {
    fetchMapLocations();
  }, [isConnected, latestSensorData]);

  // Add new Bluetooth data to live chart
  useEffect(() => {
    if (isConnected && latestSensorData) {
      const newPoint: LiveDataPoint = {
        timestamp: Date.now(),
        nitrogen: latestSensorData.nitrogen,
        phosphorus: latestSensorData.phosphorus,
        potassium: latestSensorData.potassium,
        pH: latestSensorData.pH,
      };

      setLiveData(prevData => {
        // Check if data has changed from last point
        const lastPoint = prevData[prevData.length - 1];
        if (lastPoint && 
            lastPoint.nitrogen === newPoint.nitrogen &&
            lastPoint.phosphorus === newPoint.phosphorus &&
            lastPoint.potassium === newPoint.potassium &&
            lastPoint.pH === newPoint.pH) {
          return prevData; // No change, don't add duplicate
        }

        // Add new point and keep only last MAX_LIVE_DATA_POINTS
        const updated = [...prevData, newPoint];
        if (updated.length > MAX_LIVE_DATA_POINTS) {
          return updated.slice(updated.length - MAX_LIVE_DATA_POINTS);
        }
        return updated;
      });
    }
  }, [latestSensorData, isConnected]);

  const fetchPredictions = async (silent = false) => {
    // Stop trying if we've failed 10 times
    if (predictionDisabled) {
      return;
    }

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/predict`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Increment fail count
        const newFailCount = predictionFailCount + 1;
        setPredictionFailCount(newFailCount);
        
        if (newFailCount >= 10) {
          setPredictionDisabled(true);
          console.warn('Prediction API failed 10 times, stopped automatic retries');
        } else {
          console.warn(`Prediction API returned ${response.status}, continuing without predictions (${newFailCount}/10)`);
        }
        return;
      }

      const data: PredictionResponse = await response.json();
      
      // Validate response structure
      if (data?.cleaned?.predictions) {
        setPredictionData(data);
        // Reset fail count on success
        setPredictionFailCount(0);
      }
    } catch (err) {
      // Increment fail count on error
      const newFailCount = predictionFailCount + 1;
      setPredictionFailCount(newFailCount);
      
      if (newFailCount >= 10) {
        setPredictionDisabled(true);
        console.warn('Prediction API failed 10 times, stopped automatic retries');
      } else {
        console.error(`Error fetching predictions (${newFailCount}/10):`, err);
      }
    }
  };

  const manualRetryPredictions = async () => {
    // Reset counters and try again
    setPredictionFailCount(0);
    setPredictionDisabled(false);
    await fetchPredictions(false);
  };

  useEffect(() => {
    // Only fetch predictions, current readings come from Bluetooth
    fetchPredictions(false);
    setLoading(false); // Set loading false immediately since we use Bluetooth data
    
    const interval = setInterval(() => {
      fetchPredictions(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Optimize data by aggregating and removing near-duplicates (same as history.tsx)
  const optimizeChartData = (values: number[]) => {
    if (values.length <= 30) return values; // No need to optimize if already small
    
    const BUCKET_SIZE = 15; // Group every 15 readings (captures changes, removes redundant continuous IoT data)
    const SIMILARITY_THRESHOLD = 0.1; // Values within 0.1 are considered similar
    const MAX_REPEATS = 2; // Skip if same value repeats more than twice
    
    // Step 1: Aggregate into buckets (calculate mean)
    const aggregated: number[] = [];
    for (let i = 0; i < values.length; i += BUCKET_SIZE) {
      const bucket = values.slice(i, i + BUCKET_SIZE);
      const mean = bucket.reduce((sum, val) => sum + val, 0) / bucket.length;
      aggregated.push(mean);
    }
    
    // Step 2: Remove near-duplicates that repeat too often
    const optimized: number[] = [aggregated[0]]; // Always keep first point
    let repeatCount = 1;
    let lastValue = aggregated[0];
    
    for (let i = 1; i < aggregated.length; i++) {
      const currentValue = aggregated[i];
      const diff = Math.abs(currentValue - lastValue);
      
      if (diff < SIMILARITY_THRESHOLD) {
        repeatCount++;
        // Only keep if not exceeded max repeats
        if (repeatCount <= MAX_REPEATS) {
          optimized.push(currentValue);
        }
      } else {
        // Value changed significantly, reset counter
        repeatCount = 1;
        optimized.push(currentValue);
        lastValue = currentValue;
      }
    }
    
    // Always keep last point
    if (aggregated.length > 0 && optimized[optimized.length - 1] !== aggregated[aggregated.length - 1]) {
      optimized.push(aggregated[aggregated.length - 1]);
    }
    
    return optimized;
  };

  const generateChartPath = (data: number[], width: number, height: number) => {
    if (!data || data.length === 0) return { path: '', values: [], indices: [] };
    
    // Optimize data for better performance and trend visibility
    const optimizedData = optimizeChartData(data);
    
    const min = Math.min(...optimizedData);
    const max = Math.max(...optimizedData);
    const range = max - min || 1;
    const xStep = width / (optimizedData.length - 1 || 1);
    
    const points = optimizedData.map((value, index) => {
      const x = index * xStep;
      const y = height - ((value - min) / range) * height;
      return { x, y, value };
    });
    
    const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    
    return { 
      path, 
      values: optimizedData, 
      indices: points.map((_, i) => i),
      points: points
    };
  };

  const generateLiveChartPath = (data: (number | null)[], width: number, height: number) => {
    if (!data || data.length === 0) return { path: '', values: [], points: [], min: 0, max: 0 };
    
    const validData = data.filter(v => v !== null) as number[];
    if (validData.length === 0) return { path: '', values: [], points: [], min: 0, max: 0 };
    
    // Optimize valid data
    const optimizedData = optimizeChartData(validData);
    
    // Apply smoothing to reduce fluctuations
    const smoothedData = smoothData(optimizedData, 3); // 3-point moving average
    
    const min = Math.min(...smoothedData);
    const max = Math.max(...smoothedData);
    const range = max - min || 1;
    const xStep = width / (smoothedData.length - 1 || 1);
    
    const points = smoothedData.map((value, index) => {
      const x = index * xStep;
      const y = height - ((value - min) / range) * height;
      return { x, y, value };
    });
    
    const path = points.length > 0 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
    
    return { path, values: smoothedData, points, min, max };
  };

  // Smoothing function to reduce fluctuations
  const smoothData = (data: number[], windowSize: number = 3): number[] => {
    if (data.length < windowSize) return data;
    
    const smoothed: number[] = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(data.length, i + halfWindow + 1);
      const window = data.slice(start, end);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      smoothed.push(avg);
    }
    
    return smoothed;
  };

  const getNutrientConfig = (type: NutrientType) => {
    const configs = {
      nitrogen: { label: 'Nitrogen (N)', color: '#fb444a', icon: 'leaf' as const, unit: 'ppm' },
      phosphorus: { label: 'Phosphorus (P)', color: '#0bda95', icon: 'flask' as const, unit: 'ppm' },
      potassium: { label: 'Potassium (K)', color: '#ffa500', icon: 'nutrition' as const, unit: 'ppm' },
      ph: { label: 'pH Level', color: '#00bfff', icon: 'water' as const, unit: '' },
    };
    return configs[type];
  };

  const getCurrentValue = (type: NutrientType) => {
    // Use Bluetooth data if connected, otherwise use database data
    if (isConnected && latestSensorData) {
      const map = {
        nitrogen: latestSensorData.nitrogen,
        phosphorus: latestSensorData.phosphorus,
        potassium: latestSensorData.potassium,
        ph: latestSensorData.pH,
      };
      return map[type];
    }
    
    // Fallback to database reading when not connected
    if (latestDbReading) {
      const map = {
        nitrogen: latestDbReading.nitrogen,
        phosphorus: latestDbReading.phosphorus,
        potassium: latestDbReading.potassium,
        ph: latestDbReading.pH,
      };
      return map[type];
    }
    
    return null;
  };

  const removeEmojis = (text: string) => {
    // Remove emojis and other symbols, keeping only letters, numbers, spaces, and basic punctuation
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}\u{FE0F}]/gu, '').trim();
  };

  const isTrendIncreasing = (trend: string | null) => {
    if (!trend) return false;
    const normalizedTrend = trend.toLowerCase();
    return normalizedTrend.includes('increas') || normalizedTrend.includes('up') || normalizedTrend.includes('rising');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const selectedPrediction = predictionData?.cleaned.predictions[selectedNutrient];
  const config = getNutrientConfig(selectedNutrient);
  const currentValue = getCurrentValue(selectedNutrient);
  const themedStyles = styles(colors);

  return (
    <SafeAreaView style={themedStyles.container} edges={['top']}>
      {/* Header */}
      <View style={themedStyles.header}>
        <Ionicons name="leaf-outline" size={28} color={colors.text} />
        <Text style={themedStyles.headerTitle}>Soil Dashboard</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={themedStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {loading && (
          <View style={themedStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#fb444a" />
            <Text style={themedStyles.loadingText}>Loading soil readings...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={themedStyles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#fb444a" />
            <Text style={themedStyles.errorText}>{error}</Text>
            <TouchableOpacity style={themedStyles.retryButton} onPress={() => fetchPredictions(false)}>
              <Text style={themedStyles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current/Latest Readings - Always visible */}
        <View style={themedStyles.section}>
          <View style={themedStyles.sectionHeader}>
            <View style={themedStyles.sectionTitleRow}>
              <Text style={themedStyles.sectionTitle}>
                {isConnected ? 'Current Readings' : 'Latest Readings'}
              </Text>
              {isConnected && latestSensorData && (
                <View style={themedStyles.liveIndicator}>
                  <View style={themedStyles.liveDot} />
                  <Text style={themedStyles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => {
              fetchPredictions(false);
              if (!isConnected) fetchLatestReading();
            }}>
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {/* Data Validity Mini Indicator */}
          {isConnected && !isDataValid && (
            <View style={themedStyles.miniValidityWarning}>
              <Ionicons name="alert-circle" size={14} color="#ffa500" />
              <Text style={themedStyles.miniValidityText}>
                Waiting for GPS lock - data not saved
              </Text>
            </View>
          )}
          
          <View style={themedStyles.grid}>
            <TouchableOpacity 
              style={[themedStyles.card, selectedNutrient === 'nitrogen' && themedStyles.cardSelected]}
              onPress={() => setSelectedNutrient('nitrogen')}
            >
              <Text style={themedStyles.cardLabel}>Nitrogen (N)</Text>
              <Text style={themedStyles.cardValue}>
                {isConnected && latestSensorData && latestSensorData.nitrogen !== null 
                  ? `${latestSensorData.nitrogen} ppm` 
                  : (!isConnected && latestDbReading && latestDbReading.nitrogen !== null 
                    ? `${latestDbReading.nitrogen} ppm` 
                    : '--')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[themedStyles.card, selectedNutrient === 'phosphorus' && themedStyles.cardSelected]}
              onPress={() => setSelectedNutrient('phosphorus')}
            >
              <Text style={themedStyles.cardLabel}>Phosphorus (P)</Text>
              <Text style={themedStyles.cardValue}>
                {isConnected && latestSensorData && latestSensorData.phosphorus !== null 
                  ? `${latestSensorData.phosphorus} ppm` 
                  : (!isConnected && latestDbReading && latestDbReading.phosphorus !== null 
                    ? `${latestDbReading.phosphorus} ppm` 
                    : '--')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[themedStyles.card, selectedNutrient === 'potassium' && themedStyles.cardSelected]}
              onPress={() => setSelectedNutrient('potassium')}
            >
              <Text style={themedStyles.cardLabel}>Potassium (K)</Text>
              <Text style={themedStyles.cardValue}>
                {isConnected && latestSensorData && latestSensorData.potassium !== null 
                  ? `${latestSensorData.potassium} ppm` 
                  : (!isConnected && latestDbReading && latestDbReading.potassium !== null 
                    ? `${latestDbReading.potassium} ppm` 
                    : '--')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[themedStyles.card, selectedNutrient === 'ph' && themedStyles.cardSelected]}
              onPress={() => setSelectedNutrient('ph')}
            >
              <Text style={themedStyles.cardLabel}>pH Level</Text>
              <Text style={themedStyles.cardValue}>
                {isConnected && latestSensorData && latestSensorData.pH !== null 
                  ? latestSensorData.pH.toFixed(1) 
                  : (!isConnected && latestDbReading && latestDbReading.pH !== null 
                    ? latestDbReading.pH.toFixed(1) 
                    : '--')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Map Card - Always visible */}
        {mapLocations.length > 0 && (
          <View style={themedStyles.section}>
            <View style={themedStyles.mapCard}>
              <View style={themedStyles.mapHeader}>
                <Ionicons name="location" size={24} color={colors.primary} />
                <Text style={themedStyles.mapTitle}>Reading Locations</Text>
                <Text style={themedStyles.locationCount}>{mapLocations.length} locations</Text>
              </View>

              {/* Google Map */}
              <View style={themedStyles.mapContainer}>
                <GoogleMap locations={mapLocations} height={250} />
              </View>

              {/* Location Legend */}
              <View style={themedStyles.mapLegend}>
                <View style={themedStyles.legendRow}>
                  <View style={[themedStyles.mapLegendDot, { backgroundColor: '#fb444a' }]} />
                  <Text style={themedStyles.mapLegendText}>Live Location (Connected)</Text>
                </View>
                <View style={themedStyles.legendRow}>
                  <View style={[themedStyles.mapLegendDot, { backgroundColor: colors.primary }]} />
                  <Text style={themedStyles.mapLegendText}>Historical Locations</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Live Graph - Only visible when connected */}
        {isConnected && liveData.length > 1 && (
          <View style={themedStyles.section}>
            <View style={themedStyles.liveGraphContainer}>
              <View style={themedStyles.liveGraphHeader}>
                <Ionicons name="analytics" size={24} color={colors.primary} />
                <Text style={themedStyles.liveGraphTitle}>Real-Time Trends</Text>
                {isConnected && liveData.length > 0 && (
                  <Text style={themedStyles.liveDataCount}>
                    {liveData.length}/{MAX_LIVE_DATA_POINTS} readings
                  </Text>
                )}
              </View>

              {/* Main Chart */}
              <View style={themedStyles.chartContainer}>
                {/* Y-axis labels */}
                <View style={themedStyles.yAxisLabels}>
                  <Text style={themedStyles.axisLabel}>Max</Text>
                  <Text style={themedStyles.axisLabel}>Mid</Text>
                  <Text style={themedStyles.axisLabel}>Min</Text>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Svg height={160} width={CHART_WIDTH} viewBox={`0 0 ${CHART_WIDTH} 160`}>
                    {/* Grid lines */}
                    <Path d={`M 0 40 L ${CHART_WIDTH} 40`} stroke="#3a3d42" strokeWidth="1" strokeDasharray="4,4" />
                    <Path d={`M 0 80 L ${CHART_WIDTH} 80`} stroke="#3a3d42" strokeWidth="1" strokeDasharray="4,4" />
                    <Path d={`M 0 120 L ${CHART_WIDTH} 120`} stroke="#3a3d42" strokeWidth="1" strokeDasharray="4,4" />
                    
                    {/* Nitrogen Line */}
                    {(() => {
                      const chartData = generateLiveChartPath(liveData.map(d => d.nitrogen), CHART_WIDTH, 160);
                      return (
                        <>
                          <Path
                            d={chartData.path}
                            stroke="#32cd32"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          {chartData.points.map((point, i) => (
                            <Circle key={`n-${i}`} cx={point.x} cy={point.y} r="3" fill="#32cd32" />
                          ))}
                        </>
                      );
                    })()}
                    
                    {/* Phosphorus Line */}
                    {(() => {
                      const chartData = generateLiveChartPath(liveData.map(d => d.phosphorus), CHART_WIDTH, 160);
                      return (
                        <>
                          <Path
                            d={chartData.path}
                            stroke="#ff69b4"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          {chartData.points.map((point, i) => (
                            <Circle key={`p-${i}`} cx={point.x} cy={point.y} r="3" fill="#ff69b4" />
                          ))}
                        </>
                      );
                    })()}
                    
                    {/* Potassium Line */}
                    {(() => {
                      const chartData = generateLiveChartPath(liveData.map(d => d.potassium), CHART_WIDTH, 160);
                      return (
                        <>
                          <Path
                            d={chartData.path}
                            stroke="#9370db"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          {chartData.points.map((point, i) => (
                            <Circle key={`k-${i}`} cx={point.x} cy={point.y} r="3" fill="#9370db" />
                          ))}
                        </>
                      );
                    })()}
                    
                    {/* pH Line (scaled) */}
                    {(() => {
                      const chartData = generateLiveChartPath(liveData.map(d => d.pH ? d.pH * 10 : null), CHART_WIDTH, 160);
                      return (
                        <>
                          <Path
                            d={chartData.path}
                            stroke="#ff6347"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          {chartData.points.map((point, i) => (
                            <Circle key={`ph-${i}`} cx={point.x} cy={point.y} r="3" fill="#ff6347" />
                          ))}
                        </>
                      );
                    })()}
                  </Svg>
                  
                  {/* X-axis label */}
                  <Text style={themedStyles.xAxisLabel}>Time (most recent →)</Text>
                </View>
              </View>

                {/* Legend */}
                <View style={themedStyles.legendContainer}>
                  <View style={themedStyles.legendItem}>
                    <View style={[themedStyles.legendDot, { backgroundColor: '#32cd32' }]} />
                    <Text style={themedStyles.legendText}>N</Text>
                  </View>
                  <View style={themedStyles.legendItem}>
                    <View style={[themedStyles.legendDot, { backgroundColor: '#ff69b4' }]} />
                    <Text style={themedStyles.legendText}>P</Text>
                  </View>
                  <View style={themedStyles.legendItem}>
                    <View style={[themedStyles.legendDot, { backgroundColor: '#9370db' }]} />
                    <Text style={themedStyles.legendText}>K</Text>
                  </View>
                  <View style={themedStyles.legendItem}>
                    <View style={[themedStyles.legendDot, { backgroundColor: '#ff6347' }]} />
                  <View style={[themedStyles.legendDot, { backgroundColor: '#ff6347' }]} />
                  <Text style={themedStyles.legendText}>pH (×10)</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Forecast Chart - Always visible */}
        {selectedPrediction && (
          <View style={themedStyles.section}>
            <View style={themedStyles.chartCard}>
              <View style={themedStyles.chartHeader}>
                <Ionicons name={config.icon} size={28} color={config.color} />
                <View style={themedStyles.chartHeaderText}>
                  <Text style={themedStyles.chartLabel}>Forecast</Text>
                  <Text style={[themedStyles.chartTitle, { color: config.color }]}>{config.label}</Text>
                </View>
              </View>
              
              {/* Current Value */}
              <View style={themedStyles.currentValueRow}>
                <Text style={themedStyles.currentValueLabel}>Current</Text>
                <Text style={themedStyles.currentValueText}>
                  {currentValue !== null ? currentValue.toFixed(1) : '--'} {config.unit}
                </Text>
              </View>

              {/* Trend Info */}
              {selectedPrediction.statistics.trend && (
                <View style={themedStyles.trendRow}>
                  <Text style={themedStyles.trendText}>Trend</Text>
                  <View style={themedStyles.trendValue}>
                    <Ionicons 
                      name={isTrendIncreasing(selectedPrediction.statistics.trend) ? 'arrow-up' : 'arrow-down'} 
                      size={16} 
                      color={isTrendIncreasing(selectedPrediction.statistics.trend) ? colors.primary : '#fb444a'} 
                    />
                    <Text style={isTrendIncreasing(selectedPrediction.statistics.trend) ? themedStyles.trendPositive : themedStyles.trendNegative}>
                      {removeEmojis(selectedPrediction.statistics.trend)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Chart */}
              <View style={themedStyles.chartContainer}>
                <Svg height={150} width={CHART_WIDTH} viewBox={`0 0 ${CHART_WIDTH} 150`}>
                  {selectedPrediction.forecast.length > 0 && (() => {
                    const chartData = generateChartPath(selectedPrediction.forecast, CHART_WIDTH, 150);
                    return (
                      <>
                        {/* Grid lines */}
                        <Line x1="0" y1="37.5" x2={CHART_WIDTH} y2="37.5" stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
                        <Line x1="0" y1="75" x2={CHART_WIDTH} y2="75" stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
                        <Line x1="0" y1="112.5" x2={CHART_WIDTH} y2="112.5" stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
                        
                        {/* Forecast Line */}
                        <Path
                          d={chartData.path}
                          stroke={config.color}
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                        />
                        
                        {/* Data Points */}
                        {chartData.points && chartData.points.map((point, i) => (
                          <Circle key={`forecast-${i}`} cx={point.x} cy={point.y} r="3.5" fill={config.color} />
                        ))}
                      </>
                    );
                  })()}
                </Svg>
                <View style={themedStyles.chartLabels}>
                  <Text style={themedStyles.chartLabelText}>Now</Text>
                  <Text style={themedStyles.chartLabelText}>+{Math.floor(selectedPrediction.forecast.length / 4)}h</Text>
                  <Text style={themedStyles.chartLabelText}>+{Math.floor(selectedPrediction.forecast.length / 2)}h</Text>
                  <Text style={themedStyles.chartLabelText}>+{Math.floor(3 * selectedPrediction.forecast.length / 4)}h</Text>
                  <Text style={themedStyles.chartLabelText}>+{selectedPrediction.forecast.length}h</Text>
                </View>
              </View>

              {/* Statistics */}
              <View style={themedStyles.statsGrid}>
                <View style={themedStyles.statItem}>
                  <Text style={themedStyles.statLabel}>Min</Text>
                  <Text style={themedStyles.statValue}>
                    {selectedPrediction.statistics.min?.toFixed(1) || '--'} {config.unit}
                  </Text>
                </View>
                <View style={themedStyles.statItem}>
                  <Text style={themedStyles.statLabel}>Mean</Text>
                  <Text style={themedStyles.statValue}>
                    {selectedPrediction.statistics.mean?.toFixed(1) || '--'} {config.unit}
                  </Text>
                </View>
                <View style={themedStyles.statItem}>
                  <Text style={themedStyles.statLabel}>Max</Text>
                  <Text style={themedStyles.statValue}>
                    {selectedPrediction.statistics.max?.toFixed(1) || '--'} {config.unit}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Predictions Not Available Message - Always visible when no predictions */}
        {!selectedPrediction && (
          <View style={themedStyles.section}>
            <View style={themedStyles.chartCard}>
              <View style={themedStyles.centerContent}>
                <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
                <Text style={themedStyles.unavailableTitle}>Predictions Unavailable</Text>
                <Text style={themedStyles.unavailableText}>
                  {predictionDisabled 
                    ? 'The forecast service failed after multiple attempts. Tap below to retry manually.'
                    : 'The forecast service is currently offline. Predictions will load when service is available.'}
                </Text>
                {predictionDisabled && (
                  <TouchableOpacity style={themedStyles.retryButton} onPress={manualRetryPredictions}>
                    <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={themedStyles.retryButtonText}>Retry Predictions</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Key Metrics - Always visible when predictions available */}
        {selectedPrediction && (
          <View style={[themedStyles.section, { paddingBottom: 24 }]}>
            <Text style={themedStyles.sectionTitle}>Statistics</Text>
            <View style={themedStyles.metricsGrid}>
              <View style={themedStyles.metricCard}>
                <Ionicons name="trending-up" size={32} color={colors.textSecondary} />
                <Text style={themedStyles.metricValue}>
                  {selectedPrediction.statistics.range?.toFixed(1) || '--'}
                </Text>
                <Text style={themedStyles.metricLabel}>Range</Text>
              </View>
              <View style={themedStyles.metricCard}>
                <Ionicons name="stats-chart" size={32} color={colors.textSecondary} />
                <Text style={themedStyles.metricValue}>
                  {selectedPrediction.statistics.std?.toFixed(2) || '--'}
                </Text>
                <Text style={themedStyles.metricLabel}>Std Dev</Text>
              </View>
              <View style={themedStyles.metricCard}>
                <Ionicons name="pulse" size={32} color={colors.textSecondary} />
                <Text style={themedStyles.metricValue}>
                  {predictionData?.cleaned.data_points || '--'}
                </Text>
                <Text style={themedStyles.metricLabel}>Data Points</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fb444a',
    letterSpacing: 0.5,
  },
  miniValidityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ffa500',
  },
  miniValidityText: {
    fontSize: 11,
    color: '#ffa500',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    width: '47%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#fb444a',
  },
  cardLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  chartHeaderText: {
    flex: 1,
  },
  chartLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  chartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  currentValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 6,
  },
  currentValueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  currentValueText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  trendText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendPositive: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  trendNegative: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fb444a',
    textTransform: 'capitalize',
  },
  chartContainer: {
    marginTop: 16,
    flexDirection: 'row',
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    paddingVertical: 5,
    marginRight: 8,
    height: 160,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  xAxisLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  chartLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#fb444a',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#fb444a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  unavailableText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  liveGraphContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  liveGraphHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  liveGraphTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  liveDataCount: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  mapCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  mapTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  locationCount: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapContainer: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapLegendText: {
    fontSize: 12,
    color: colors.text,
  },
  locationList: {
    gap: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fb444a',
    backgroundColor: 'rgba(251, 68, 74, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moreLocations: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
