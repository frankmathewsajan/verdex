import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Line, Path, Svg } from 'react-native-svg';

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
        throw new Error(`Prediction API error: ${response.status}`);
      }

      const data: PredictionResponse = await response.json();
      setPredictionData(data);
    } catch (err) {
      console.error('Error fetching predictions:', err);
    }
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
      nitrogen: { label: 'Nitrogen (N)', color: '#fb444a', icon: 'leaf' as const },
      phosphorus: { label: 'Phosphorus (P)', color: '#0bda95' as const, icon: 'flask' as const },
      potassium: { label: 'Potassium (K)', color: '#ffa500' as const, icon: 'nutrition' as const },
      ph: { label: 'pH Level', color: '#00bfff' as const, icon: 'water' as const },
    };
    return configs[type];
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
              <TouchableOpacity onPress={() => fetchSoilReadings(false)}>
                <Ionicons name="refresh" size={20} color="#9e9c93" />
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Nitrogen (N)</Text>
                <Text style={styles.cardValue}>{soilData.nitrogen} ppm</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Phosphorus (P)</Text>
                <Text style={styles.cardValue}>{soilData.phosphorus} ppm</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Potassium (K)</Text>
                <Text style={styles.cardValue}>{soilData.potassium} ppm</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>pH Level</Text>
                <Text style={styles.cardValue}>{soilData.ph_level.toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.timestamp}>
              Last updated: {new Date(soilData.recorded_at).toLocaleString()}
            </Text>
          </View>
        )}

        {/* 24-Hour Trends */}
        {soilData && !loading && (
        <View style={styles.section}>
          <View style={styles.chartCard}>
            <Text style={styles.chartLabel}>24-Hour Trends</Text>
            <Text style={styles.chartTitle}>Nitrogen</Text>
            <View style={styles.trendRow}>
              <Text style={styles.trendText}>Last 24h</Text>
              <View style={styles.trendValue}>
                <Ionicons name="arrow-up" size={16} color="#0bda95" />
                <Text style={styles.trendPositive}>+2.5%</Text>
              </View>
            </View>
            <View style={styles.chartContainer}>
              <Svg height={150} width="100%" viewBox="0 0 472 150">
                <Defs>
                  <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#fb444a" stopOpacity="0.4" />
                    <Stop offset="1" stopColor="#fb444a" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H0V109Z"
                  fill="url(#grad)"
                />
                <Path
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
                  stroke="#fb444a"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabelText}>-24h</Text>
                <Text style={styles.chartLabelText}>-18h</Text>
                <Text style={styles.chartLabelText}>-12h</Text>
                <Text style={styles.chartLabelText}>-6h</Text>
                <Text style={styles.chartLabelText}>Now</Text>
              </View>
            </View>
          </View>
        </View>
        )}

        {/* 10-Hour Forecast */}
        {soilData && !loading && (
        <View style={styles.section}>
          <View style={styles.chartCard}>
            <Text style={styles.chartLabel}>10-Hour Forecast</Text>
            <Text style={styles.chartTitle}>Nitrogen</Text>
            <View style={styles.trendRow}>
              <Text style={styles.trendText}>Next 10h</Text>
              <View style={styles.trendValue}>
                <Ionicons name="arrow-down" size={16} color="#fb444a" />
                <Text style={styles.trendNegative}>-1.8%</Text>
              </View>
            </View>
            <View style={styles.chartContainer}>
              <Svg height={150} width="100%" viewBox="0 0 472 150">
                <Path
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
                  stroke="#e0daca"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="8,8"
                  strokeLinecap="round"
                />
              </Svg>
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabelText}>Now</Text>
                <Text style={styles.chartLabelText}>+2h</Text>
                <Text style={styles.chartLabelText}>+4h</Text>
                <Text style={styles.chartLabelText}>+6h</Text>
                <Text style={styles.chartLabelText}>+10h</Text>
              </View>
            </View>
          </View>
        </View>
        )}

        {/* Alerts */}
        {soilData && !loading && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          <TouchableOpacity style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="warning" size={24} color="#fb444a" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Low Nitrogen Detected</Text>
              <Text style={styles.alertTime}>5 minutes ago</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9e9c93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="flask" size={24} color="#fb444a" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>pH Unbalanced</Text>
              <Text style={styles.alertTime}>2 hours ago</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9e9c93" />
          </TouchableOpacity>
        </View>
        )}

        {/* Key Metrics */}
        {soilData && !loading && (
        <View style={[styles.section, { paddingBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="water" size={32} color="#9e9c93" />
              <Text style={styles.metricValue}>45%</Text>
              <Text style={styles.metricLabel}>Moisture</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="thermometer" size={32} color="#9e9c93" />
              <Text style={styles.metricValue}>18°C</Text>
              <Text style={styles.metricLabel}>Temperature</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="flash" size={32} color="#9e9c93" />
              <Text style={styles.metricValue}>1.2</Text>
              <Text style={styles.metricLabel}>EC (dS/m)</Text>
            </View>
          </View>
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
  chartLabel: {
    fontSize: 16,
    color: '#9e9c93',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e0daca',
    marginBottom: 8,
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
  },
  trendPositive: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0bda95',
  },
  trendNegative: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fb444a',
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#46474a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 68, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e0daca',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 14,
    color: '#9e9c93',
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
});
