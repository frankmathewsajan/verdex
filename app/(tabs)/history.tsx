import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_POINT_SPACING = 3; // Minimum pixels between data points (~0.2cm - very compact for trend visibility)
const CHART_HEIGHT = 320;
const CHART_PADDING_LEFT = 40;

interface SensorReading {
  id: number;
  created_at: string;
  latitude: number;
  longitude: number;
  satellite_count: number;
  bearing: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  moisture: number;
  temperature: number;
  humidity: number | null;
  soil_conductivity: number;
  device_id: string;
  device_name: string;
  user_id: string;
}

export default function HistoryScreen() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'nutrients' | 'environment'>('all');

  // Calculate dynamic chart width based on number of readings
  const getChartWidth = () => {
    const baseWidth = Math.max(
      SCREEN_WIDTH - 80,
      readings.length * MIN_POINT_SPACING
    );
    // Cap maximum width to prevent canvas memory issues
    const MAX_WIDTH = 10000; // Maximum 10000px to prevent crashes
    return Math.min(baseWidth, MAX_WIDTH);
  };

  const CHART_WIDTH = getChartWidth();

  const metrics = [
    { key: 'nitrogen', label: 'Nitrogen', color: '#32cd32', unit: 'mg/kg', minRange: 0, maxRange: 50 },
    { key: 'phosphorus', label: 'Phosphorus', color: '#ff69b4', unit: 'mg/kg', minRange: 0, maxRange: 50 },
    { key: 'potassium', label: 'Potassium', color: '#9370db', unit: 'mg/kg', minRange: 0, maxRange: 100 },
    { key: 'ph', label: 'pH', color: '#ff6347', unit: '', scale: 10, minRange: 50, maxRange: 140 }, // pH 5-14 scaled by 10
    { key: 'temperature', label: 'Temperature', color: '#ffa500', unit: '°C', minRange: 15, maxRange: 40 },
    { key: 'moisture', label: 'Moisture', color: '#1e90ff', unit: '%', minRange: 0, maxRange: 100 },
  ];

  const getVisibleMetrics = () => {
    if (selectedMetric === 'nutrients') {
      return metrics.filter(m => ['nitrogen', 'phosphorus', 'potassium', 'ph'].includes(m.key));
    }
    if (selectedMetric === 'environment') {
      return metrics.filter(m => ['temperature', 'moisture'].includes(m.key));
    }
    return metrics;
  };

  // Optimize data by aggregating and removing near-duplicates
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
    
    console.log(`Data optimization: ${values.length} → ${aggregated.length} (aggregated) → ${optimized.length} (final)`);
    return optimized;
  };

  const generateChartPath = (dataKey: keyof SensorReading, metricScale: number = 1, chartWidth: number, minRange?: number, maxRange?: number) => {
    if (readings.length === 0) return { path: '', minValue: 0, maxValue: 0, values: [], indices: [] };

    const rawValues = readings.map(r => {
      const val = r[dataKey];
      return typeof val === 'number' ? val * metricScale : 0;
    }).reverse(); // Reverse to show oldest to newest

    // Optimize data for better performance
    const values = optimizeChartData(rawValues);

    // Use fixed ranges if provided, otherwise calculate from data
    let minValue: number;
    let maxValue: number;
    
    if (minRange !== undefined && maxRange !== undefined) {
      minValue = minRange;
      maxValue = maxRange;
    } else {
      const dataMax = Math.max(...values);
      const dataMin = Math.min(...values);
      const padding = (dataMax - dataMin) * 0.1 || 1;
      maxValue = dataMax + padding;
      minValue = Math.max(0, dataMin - padding);
    }
    
    const range = maxValue - minValue || 1;
    const xStep = chartWidth / Math.max(values.length - 1, 1);
    const yScale = (CHART_HEIGHT - 60) / range;

    // Sample points for circles to avoid rendering thousands of circles
    const MAX_VISIBLE_POINTS = 200; // Maximum circles to render
    const samplingRate = Math.max(1, Math.ceil(values.length / MAX_VISIBLE_POINTS));
    const sampledIndices: number[] = [];
    
    for (let i = 0; i < values.length; i += samplingRate) {
      sampledIndices.push(i);
    }
    // Always include last point
    if (sampledIndices[sampledIndices.length - 1] !== values.length - 1) {
      sampledIndices.push(values.length - 1);
    }

    let path = '';
    values.forEach((value, index) => {
      const x = CHART_PADDING_LEFT + (index * xStep);
      const y = CHART_HEIGHT - 40 - ((Math.max(minValue, Math.min(maxValue, value)) - minValue) * yScale);
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return { path, minValue, maxValue, values, indices: sampledIndices };
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to view history');
        setLoading(false);
        return;
      }

      // Fetch from sensor_readings table (new structure)
      const { data, error: fetchError } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300);

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        throw new Error(fetchError.message);
      }

      setReadings(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getLatestReading = () => readings[0] || null;

  const latestReading = getLatestReading();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
          <Ionicons name="analytics" size={28} color="#e0daca" />
          <Text style={styles.headerTitle}>History</Text>
          <TouchableOpacity onPress={fetchHistory}>
            <Ionicons name="refresh" size={24} color="#e0daca" />
          </TouchableOpacity>
        </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#fb444a" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#fb444a" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : readings.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="document-outline" size={64} color="#9e9c93" />
          <Text style={styles.emptyText}>No history data available</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, selectedMetric === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedMetric('all')}
            >
              <Text style={[styles.filterText, selectedMetric === 'all' && styles.filterTextActive]}>
                All Metrics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedMetric === 'nutrients' && styles.filterButtonActive]}
              onPress={() => setSelectedMetric('nutrients')}
            >
              <Text style={[styles.filterText, selectedMetric === 'nutrients' && styles.filterTextActive]}>
                Nutrients
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedMetric === 'environment' && styles.filterButtonActive]}
              onPress={() => setSelectedMetric('environment')}
            >
              <Text style={[styles.filterText, selectedMetric === 'environment' && styles.filterTextActive]}>
                Environment
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chart Info */}
          <View style={styles.chartInfo}>
            <Text style={styles.chartTitle}>Historical Trends</Text>
            <Text style={styles.chartSubtitle}>
              {readings.length} readings • {readings[readings.length - 1] && new Date(readings[readings.length - 1].created_at).toLocaleDateString()} to {latestReading && new Date(latestReading.created_at).toLocaleDateString()}
            </Text>
          </View>

          {/* Chart - Scrollable */}
          <View style={styles.chartContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              style={styles.chartScroll}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              <Svg height={CHART_HEIGHT} width={CHART_WIDTH + CHART_PADDING_LEFT}>
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => {
                    const y = 20 + ((CHART_HEIGHT - 60) * (i / 4));
                    return (
                      <Line
                        key={`grid-${i}`}
                        x1={CHART_PADDING_LEFT}
                        y1={y}
                        x2={CHART_WIDTH + CHART_PADDING_LEFT}
                        y2={y}
                        stroke="#46474a"
                        strokeWidth={1}
                        strokeDasharray="4,4"
                      />
                    );
                  })}

                  {/* Y-axis labels - show range for first visible metric */}
                  {getVisibleMetrics().length > 0 && (() => {
                    const firstMetric = getVisibleMetrics()[0];
                    const chartData = generateChartPath(
                      firstMetric.key as keyof SensorReading, 
                      firstMetric.scale || 1, 
                      CHART_WIDTH,
                      firstMetric.minRange,
                      firstMetric.maxRange
                    );
                    return [0, 2, 4].map(i => {
                      const y = 20 + ((CHART_HEIGHT - 60) * (i / 4));
                      const value = chartData.maxValue - ((chartData.maxValue - chartData.minValue) * (i / 4));
                      const displayValue = firstMetric.scale ? (value / firstMetric.scale).toFixed(1) : value.toFixed(0);
                      
                      return (
                        <SvgText
                          key={`y-label-${i}`}
                          x={CHART_PADDING_LEFT - 8}
                          y={y + 4}
                          fontSize={10}
                          fill="#9e9c93"
                          textAnchor="end"
                        >
                          {displayValue}
                        </SvgText>
                      );
                    });
                  })()}

                  {/* Data lines */}
                  {getVisibleMetrics().map(metric => {
                    const chartData = generateChartPath(
                      metric.key as keyof SensorReading, 
                      metric.scale || 1, 
                      CHART_WIDTH,
                      metric.minRange,
                      metric.maxRange
                    );
                    return (
                      <Path
                        key={metric.key}
                        d={chartData.path}
                        stroke={metric.color}
                        strokeWidth={3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  {/* Data points - Only render sampled points to prevent crashes */}
                  {getVisibleMetrics().map(metric => {
                    const chartData = generateChartPath(
                      metric.key as keyof SensorReading, 
                      metric.scale || 1, 
                      CHART_WIDTH,
                      metric.minRange,
                      metric.maxRange
                    );
                    const { values, minValue, maxValue, indices } = chartData;
                    const range = maxValue - minValue || 1;
                    const xStep = CHART_WIDTH / Math.max(values.length - 1, 1);
                    const yScale = (CHART_HEIGHT - 60) / range;

                    // Only render sampled indices to reduce memory usage
                    return indices.map((index) => {
                      const value = values[index];
                      const x = CHART_PADDING_LEFT + (index * xStep);
                      const clampedValue = Math.max(minValue, Math.min(maxValue, value));
                      const y = CHART_HEIGHT - 40 - ((clampedValue - minValue) * yScale);
                      
                      return (
                        <Circle
                          key={`${metric.key}-${index}`}
                          cx={x}
                          cy={y}
                          r={3.5}
                          fill={metric.color}
                        />
                      );
                    });
                  })}

                  {/* X-axis labels (dates) - show more labels when spaced out */}
                  {readings.length > 0 && (() => {
                    const labelCount = Math.min(10, readings.length);
                    const step = Math.floor(readings.length / labelCount);
                    const indices = Array.from({ length: labelCount }, (_, i) => i * step).filter(i => i < readings.length);
                    
                    return indices.map(index => {
                      const reading = readings[readings.length - 1 - index];
                      const x = CHART_PADDING_LEFT + (index * (CHART_WIDTH / Math.max(readings.length - 1, 1)));
                      const date = new Date(reading.created_at);
                      const label = `${date.getMonth() + 1}/${date.getDate()}`;
                      
                      return (
                        <SvgText
                          key={`date-${index}`}
                          x={x}
                          y={CHART_HEIGHT - 10}
                          fontSize={10}
                          fill="#9e9c93"
                          textAnchor="middle"
                        >
                          {label}
                        </SvgText>
                      );
                    });
                  })()}
                </Svg>
              </ScrollView>
              <View style={styles.zoomHint}>
                <Ionicons name="arrow-forward-outline" size={12} color="#9e9c93" />
                <Text style={styles.zoomHintText}>Scroll horizontally to view all data</Text>
              </View>
            </View>

          {/* Legend */}
          <View style={styles.legend}>
            {getVisibleMetrics().map(metric => (
              <View key={metric.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: metric.color }]} />
                <Text style={styles.legendLabel}>
                  {metric.label} {metric.unit && `(${metric.unit})`}
                </Text>
              </View>
            ))}
          </View>

          {/* Latest Reading Summary */}
          {latestReading && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Latest Reading</Text>
              <Text style={styles.summaryTime}>
                {new Date(latestReading.created_at).toLocaleString()}
              </Text>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Nitrogen</Text>
                  <Text style={[styles.summaryValue, { color: '#32cd32' }]}>
                    {latestReading.nitrogen}
                  </Text>
                  <Text style={styles.summaryUnit}>mg/kg</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Phosphorus</Text>
                  <Text style={[styles.summaryValue, { color: '#ff69b4' }]}>
                    {latestReading.phosphorus}
                  </Text>
                  <Text style={styles.summaryUnit}>mg/kg</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Potassium</Text>
                  <Text style={[styles.summaryValue, { color: '#9370db' }]}>
                    {latestReading.potassium}
                  </Text>
                  <Text style={styles.summaryUnit}>mg/kg</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>pH</Text>
                  <Text style={[styles.summaryValue, { color: '#ff6347' }]}>
                    {latestReading.ph.toFixed(1)}
                  </Text>
                  <Text style={styles.summaryUnit}>pH</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Temperature</Text>
                  <Text style={[styles.summaryValue, { color: '#ffa500' }]}>
                    {latestReading.temperature.toFixed(1)}
                  </Text>
                  <Text style={styles.summaryUnit}>°C</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Moisture</Text>
                  <Text style={[styles.summaryValue, { color: '#1e90ff' }]}>
                    {latestReading.moisture}
                  </Text>
                  <Text style={styles.summaryUnit}>%</Text>
                </View>
              </View>

              <View style={styles.sourceInfo}>
                <Ionicons name="cube-outline" size={14} color="#9e9c93" />
                <Text style={styles.sourceText}>
                  Device: {latestReading.device_name} • ID: {latestReading.id}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#9e9c93',
  },
  errorText: {
    fontSize: 16,
    color: '#fb444a',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9e9c93',
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#fb444a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#46474a',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#fb444a',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9e9c93',
  },
  filterTextActive: {
    color: '#fff',
  },
  chartInfo: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0daca',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#9e9c93',
  },
  chartContainer: {
    backgroundColor: '#46474a',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  chartScroll: {
    maxHeight: CHART_HEIGHT + 20,
  },
  zoomHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
  },
  zoomHintText: {
    fontSize: 10,
    color: '#9e9c93',
    fontStyle: 'italic',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#e0daca',
    fontWeight: '500',
  },
  summaryContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#46474a',
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0daca',
    marginBottom: 4,
  },
  summaryTime: {
    fontSize: 12,
    color: '#9e9c93',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#3a3d42',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#9e9c93',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  summaryUnit: {
    fontSize: 10,
    color: '#9e9c93',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3d42',
  },
  sourceText: {
    fontSize: 11,
    color: '#9e9c93',
  },
});
