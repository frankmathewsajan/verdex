import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Line, Path, Svg } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;

interface SoilReading {
  id: string;
  device_id: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph_level: number;
  recorded_at: string;
}

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

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const [soilData, setSoilData] = useState<SoilReading | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientType>('nitrogen');
  const [predictionFailCount, setPredictionFailCount] = useState(0);
  const [predictionDisabled, setPredictionDisabled] = useState(false);

  const fetchSoilReadings = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/latest-soil-readings`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.latest) {
        setSoilData(data.latest);
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      } else if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching soil readings:', err);
      if (!silent) {
        setError('Failed to load soil readings');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

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
    fetchSoilReadings(false);
    fetchPredictions(false);
    
    const interval = setInterval(() => {
      fetchSoilReadings(true);
      fetchPredictions(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const generateChartPath = (data: number[], width: number, height: number) => {
    if (!data || data.length === 0) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const xStep = width / (data.length - 1 || 1);
    
    const points = data.map((value, index) => {
      const x = index * xStep;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
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
    if (!soilData) return null;
    const map = {
      nitrogen: soilData.nitrogen,
      phosphorus: soilData.phosphorus,
      potassium: soilData.potassium,
      ph: soilData.ph_level,
    };
    return map[type];
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="leaf-outline" size={28} color="#e0daca" />
        <Text style={styles.headerTitle}>Soil Dashboard</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#e0daca" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fb444a" />
            <Text style={styles.loadingText}>Loading soil readings...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#fb444a" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchSoilReadings(false)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current Readings */}
        {soilData && !loading && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Readings</Text>
              <TouchableOpacity onPress={() => { fetchSoilReadings(false); fetchPredictions(false); }}>
                <Ionicons name="refresh" size={20} color="#9e9c93" />
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              <TouchableOpacity 
                style={[styles.card, selectedNutrient === 'nitrogen' && styles.cardSelected]}
                onPress={() => setSelectedNutrient('nitrogen')}
              >
                <Text style={styles.cardLabel}>Nitrogen (N)</Text>
                <Text style={styles.cardValue}>{soilData.nitrogen} ppm</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.card, selectedNutrient === 'phosphorus' && styles.cardSelected]}
                onPress={() => setSelectedNutrient('phosphorus')}
              >
                <Text style={styles.cardLabel}>Phosphorus (P)</Text>
                <Text style={styles.cardValue}>{soilData.phosphorus} ppm</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.card, selectedNutrient === 'potassium' && styles.cardSelected]}
                onPress={() => setSelectedNutrient('potassium')}
              >
                <Text style={styles.cardLabel}>Potassium (K)</Text>
                <Text style={styles.cardValue}>{soilData.potassium} ppm</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.card, selectedNutrient === 'ph' && styles.cardSelected]}
                onPress={() => setSelectedNutrient('ph')}
              >
                <Text style={styles.cardLabel}>pH Level</Text>
                <Text style={styles.cardValue}>{soilData.ph_level.toFixed(1)}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.timestamp}>
              Last updated: {new Date(soilData.recorded_at).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Forecast Chart */}
        {soilData && !loading && selectedPrediction && (
          <View style={styles.section}>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name={config.icon} size={28} color={config.color} />
                <View style={styles.chartHeaderText}>
                  <Text style={styles.chartLabel}>Forecast</Text>
                  <Text style={[styles.chartTitle, { color: config.color }]}>{config.label}</Text>
                </View>
              </View>
              
              {/* Current Value */}
              <View style={styles.currentValueRow}>
                <Text style={styles.currentValueLabel}>Current</Text>
                <Text style={styles.currentValueText}>
                  {currentValue !== null ? currentValue.toFixed(1) : '--'} {config.unit}
                </Text>
              </View>

              {/* Trend Info */}
              {selectedPrediction.statistics.trend && (
                <View style={styles.trendRow}>
                  <Text style={styles.trendText}>Trend</Text>
                  <View style={styles.trendValue}>
                    <Ionicons 
                      name={isTrendIncreasing(selectedPrediction.statistics.trend) ? 'arrow-up' : 'arrow-down'} 
                      size={16} 
                      color={isTrendIncreasing(selectedPrediction.statistics.trend) ? '#0bda95' : '#fb444a'} 
                    />
                    <Text style={isTrendIncreasing(selectedPrediction.statistics.trend) ? styles.trendPositive : styles.trendNegative}>
                      {removeEmojis(selectedPrediction.statistics.trend)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Chart */}
              <View style={styles.chartContainer}>
                <Svg height={150} width={CHART_WIDTH} viewBox={`0 0 ${CHART_WIDTH} 150`}>
                  {selectedPrediction.forecast.length > 0 && (
                    <>
                      <Path
                        d={generateChartPath(selectedPrediction.forecast, CHART_WIDTH, 150)}
                        stroke={config.color}
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Grid lines */}
                      <Line x1="0" y1="37.5" x2={CHART_WIDTH} y2="37.5" stroke="#46474a" strokeWidth="1" strokeDasharray="4,4" />
                      <Line x1="0" y1="75" x2={CHART_WIDTH} y2="75" stroke="#46474a" strokeWidth="1" strokeDasharray="4,4" />
                      <Line x1="0" y1="112.5" x2={CHART_WIDTH} y2="112.5" stroke="#46474a" strokeWidth="1" strokeDasharray="4,4" />
                    </>
                  )}
                </Svg>
                <View style={styles.chartLabels}>
                  <Text style={styles.chartLabelText}>Now</Text>
                  <Text style={styles.chartLabelText}>+{Math.floor(selectedPrediction.forecast.length / 4)}h</Text>
                  <Text style={styles.chartLabelText}>+{Math.floor(selectedPrediction.forecast.length / 2)}h</Text>
                  <Text style={styles.chartLabelText}>+{Math.floor(3 * selectedPrediction.forecast.length / 4)}h</Text>
                  <Text style={styles.chartLabelText}>+{selectedPrediction.forecast.length}h</Text>
                </View>
              </View>

              {/* Statistics */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Min</Text>
                  <Text style={styles.statValue}>
                    {selectedPrediction.statistics.min?.toFixed(1) || '--'} {config.unit}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Mean</Text>
                  <Text style={styles.statValue}>
                    {selectedPrediction.statistics.mean?.toFixed(1) || '--'} {config.unit}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Max</Text>
                  <Text style={styles.statValue}>
                    {selectedPrediction.statistics.max?.toFixed(1) || '--'} {config.unit}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Predictions Not Available Message */}
        {soilData && !loading && !selectedPrediction && (
          <View style={styles.section}>
            <View style={styles.chartCard}>
              <View style={styles.centerContent}>
                <Ionicons name="cloud-offline-outline" size={48} color="#9e9c93" />
                <Text style={styles.unavailableTitle}>Predictions Unavailable</Text>
                <Text style={styles.unavailableText}>
                  {predictionDisabled 
                    ? 'The forecast service failed after multiple attempts. Tap below to retry manually.'
                    : 'The forecast service is currently offline. Current readings are still available above.'}
                </Text>
                {predictionDisabled && (
                  <TouchableOpacity style={styles.retryButton} onPress={manualRetryPredictions}>
                    <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.retryButtonText}>Retry Predictions</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Key Metrics */}
        {soilData && !loading && (
          <View style={[styles.section, { paddingBottom: 24 }]}>
            <Text style={styles.sectionTitle}>Statistics</Text>
            {selectedPrediction && (
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Ionicons name="trending-up" size={32} color="#9e9c93" />
                  <Text style={styles.metricValue}>
                    {selectedPrediction.statistics.range?.toFixed(1) || '--'}
                  </Text>
                  <Text style={styles.metricLabel}>Range</Text>
                </View>
                <View style={styles.metricCard}>
                  <Ionicons name="stats-chart" size={32} color="#9e9c93" />
                  <Text style={styles.metricValue}>
                    {selectedPrediction.statistics.std?.toFixed(2) || '--'}
                  </Text>
                  <Text style={styles.metricLabel}>Std Dev</Text>
                </View>
                <View style={styles.metricCard}>
                  <Ionicons name="pulse" size={32} color="#9e9c93" />
                  <Text style={styles.metricValue}>
                    {predictionData?.cleaned.data_points || '--'}
                  </Text>
                  <Text style={styles.metricLabel}>Data Points</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#303135',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#46474a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0daca',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0daca',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#46474a',
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
    color: '#9e9c93',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0daca',
  },
  chartCard: {
    backgroundColor: '#46474a',
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
    color: '#9e9c93',
    marginBottom: 4,
  },
  chartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0daca',
  },
  currentValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#303135',
    borderRadius: 6,
  },
  currentValueLabel: {
    fontSize: 14,
    color: '#9e9c93',
  },
  currentValueText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0daca',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  trendText: {
    fontSize: 16,
    color: '#9e9c93',
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendPositive: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0bda95',
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
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  chartLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9e9c93',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#303135',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#9e9c93',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0daca',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#46474a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0daca',
  },
  metricLabel: {
    fontSize: 11,
    color: '#9e9c93',
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
    color: '#9e9c93',
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
    color: '#9e9c93',
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
    color: '#e0daca',
    marginTop: 8,
  },
  unavailableText: {
    fontSize: 14,
    color: '#9e9c93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
