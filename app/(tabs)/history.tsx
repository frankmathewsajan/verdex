import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use Supabase client - order by datetime column
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

  const renderItem = ({ item }: { item: SensorReading }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={16} color="#9e9c93" />
          <Text style={styles.timestamp}>
            {new Date(item.datetime).toLocaleString()}
          </Text>
        </View>
        <Text style={styles.deviceId}>Source: {item.data_source}</Text>
      </View>
      
      <View style={styles.readingsGrid}>
        <View style={styles.readingItem}>
          <Text style={styles.readingLabel}>N</Text>
          <Text style={styles.readingValue}>{item.nitrogen}</Text>
        </View>
        <View style={styles.readingItem}>
          <Text style={styles.readingLabel}>P</Text>
          <Text style={styles.readingValue}>{item.phosphorus}</Text>
        </View>
        <View style={styles.readingItem}>
          <Text style={styles.readingLabel}>K</Text>
          <Text style={styles.readingValue}>{item.potassium}</Text>
        </View>
        <View style={styles.readingItem}>
          <Text style={styles.readingLabel}>pH</Text>
          <Text style={styles.readingValue}>{item.ph.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.additionalData}>
        <View style={styles.additionalItem}>
          <Ionicons name="water" size={14} color="#9e9c93" />
          <Text style={styles.additionalText}>{item.humidity.toFixed(1)}%</Text>
        </View>
        <View style={styles.additionalItem}>
          <Ionicons name="thermometer" size={14} color="#9e9c93" />
          <Text style={styles.additionalText}>{item.temperature.toFixed(1)}°C</Text>
        </View>
        <View style={styles.additionalItem}>
          <Ionicons name="cube" size={14} color="#9e9c93" />
          <Text style={styles.additionalText}>ID: {item.id}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="time" size={28} color="#e0daca" />
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
        <FlatList
          data={readings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#46474a',
    borderRadius: 8,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#303135',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#9e9c93',
  },
  deviceId: {
    fontSize: 11,
    color: '#9e9c93',
    fontFamily: 'monospace',
  },
  readingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  readingItem: {
    alignItems: 'center',
  },
  readingLabel: {
    fontSize: 12,
    color: '#9e9c93',
    marginBottom: 4,
  },
  readingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0daca',
  },
  additionalData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#303135',
  },
  additionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  additionalText: {
    fontSize: 12,
    color: '#9e9c93',
  },
});

