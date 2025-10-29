import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64; // Padding on both sides
const CHART_HEIGHT = 250;

interface SensorReading {
  id: number;
  datetime: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  temperature: number;
  humidity: number;
  created_at: string;
  updated_at: string;
  data_source: string;
}

export default function HistoryScreen() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'nutrients' | 'environment'>('all');

  const metrics = [
    { key: 'nitrogen', label: 'Nitrogen', color: '#32cd32', unit: 'mg/kg' },
    { key: 'phosphorus', label: 'Phosphorus', color: '#ff69b4', unit: 'mg/kg' },
    { key: 'potassium', label: 'Potassium', color: '#9370db', unit: 'mg/kg' },
    { key: 'ph', label: 'pH', color: '#ff6347', unit: '', scale: 10 },
    { key: 'temperature', label: 'Temperature', color: '#ffa500', unit: '°C' },
    { key: 'humidity', label: 'Humidity', color: '#1e90ff', unit: '%' },
  ];

  const getVisibleMetrics = () => {
    if (selectedMetric === 'nutrients') {
      return metrics.filter(m => ['nitrogen', 'phosphorus', 'potassium', 'ph'].includes(m.key));
    }
    if (selectedMetric === 'environment') {
      return metrics.filter(m => ['temperature', 'humidity'].includes(m.key));
    }
    return metrics;
  };

  const generateChartPath = (dataKey: keyof SensorReading, scale: number = 1) => {
    if (readings.length === 0) return '';

    const values = readings.map(r => {
      const val = r[dataKey];
      return typeof val === 'number' ? val * scale : 0;
    }).reverse(); // Reverse to show oldest to newest

    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;

    const xStep = CHART_WIDTH / Math.max(values.length - 1, 1);
    const yScale = (CHART_HEIGHT - 40) / range;

    let path = '';
    values.forEach((value, index) => {
      const x = index * xStep;
      const y = CHART_HEIGHT - 20 - ((value - minValue) * yScale);
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return path;
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('raw_sensor_readings')
        .select('*')
        .order('datetime', { ascending: false })
        .limit(100);

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
              {readings.length} readings • {readings[readings.length - 1] && new Date(readings[readings.length - 1].datetime).toLocaleDateString()} to {latestReading && new Date(latestReading.datetime).toLocaleDateString()}
            </Text>
          </View>

          {/* Chart */}
          <View style={styles.chartContainer}>
            <Svg height={CHART_HEIGHT} width={CHART_WIDTH}>
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => {
                const y = (CHART_HEIGHT - 20) * (i / 4);
                return (
                  <Line
                    key={`grid-${i}`}
                    x1={0}
                    y1={y}
                    x2={CHART_WIDTH}
                    y2={y}
                    stroke="#46474a"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                );
              })}

              {/* Data lines */}
              {getVisibleMetrics().map(metric => {
                const path = generateChartPath(metric.key as keyof SensorReading, metric.scale || 1);
                return (
                  <Path
                    key={metric.key}
                    d={path}
                    stroke={metric.color}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}

              {/* Data points */}
              {getVisibleMetrics().map(metric => {
                const values = readings.map(r => {
                  const val = r[metric.key as keyof SensorReading];
                  return typeof val === 'number' ? val * (metric.scale || 1) : 0;
                }).reverse();

                const maxValue = Math.max(...values, 1);
                const minValue = Math.min(...values, 0);
                const range = maxValue - minValue || 1;
                const xStep = CHART_WIDTH / Math.max(values.length - 1, 1);
                const yScale = (CHART_HEIGHT - 40) / range;

                return values.map((value, index) => {
                  const x = index * xStep;
                  const y = CHART_HEIGHT - 20 - ((value - minValue) * yScale);
                  
                  return (
                    <Circle
                      key={`${metric.key}-${index}`}
                      cx={x}
                      cy={y}
                      r={3}
                      fill={metric.color}
                    />
                  );
                });
              })}

              {/* X-axis labels (dates) */}
              {readings.length > 0 && [0, Math.floor(readings.length / 2), readings.length - 1].map(index => {
                if (index >= readings.length) return null;
                const reading = readings[readings.length - 1 - index];
                const x = index * (CHART_WIDTH / Math.max(readings.length - 1, 1));
                const date = new Date(reading.datetime);
                const label = `${date.getMonth() + 1}/${date.getDate()}`;
                
                return (
                  <SvgText
                    key={`date-${index}`}
                    x={x}
                    y={CHART_HEIGHT - 5}
                    fontSize={10}
                    fill="#9e9c93"
                    textAnchor="middle"
                  >
                    {label}
                  </SvgText>
                );
              })}
            </Svg>
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
                {new Date(latestReading.datetime).toLocaleString()}
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
                  <Text style={styles.summaryLabel}>Humidity</Text>
                  <Text style={[styles.summaryValue, { color: '#1e90ff' }]}>
                    {latestReading.humidity.toFixed(1)}
                  </Text>
                  <Text style={styles.summaryUnit}>%</Text>
                </View>
              </View>

              <View style={styles.sourceInfo}>
                <Ionicons name="cube-outline" size={14} color="#9e9c93" />
                <Text style={styles.sourceText}>
                  Source: {latestReading.data_source} • ID: {latestReading.id}
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
    alignItems: 'center',
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
