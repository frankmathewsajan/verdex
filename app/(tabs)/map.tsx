import GoogleMap from '@/components/google-map';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { useTheme } from '@/contexts/theme-context';
import { createMapStyles } from '@/styles/map.styles';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MapLocation {
  latitude: number;
  longitude: number;
  isLive: boolean;
  timestamp: string;
  time: string; // Formatted time for display
  id?: string;
}

export default function MapScreen() {
  const { colors } = useTheme();
  const { latestSensorData, isConnected } = useBluetooth();
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [centerLocation, setCenterLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const styles = createMapStyles(colors);

  // Format time from ISO string
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get start and end of today in ISO format
  const getTodayRange = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    };
  };

  // Fetch today's map locations from database
  const fetchMapLocations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const userId = (user as any)?.uid || (user as any)?.id;
      const { start, end } = getTodayRange();

      const { data, error: fetchError } = await supabase
        .from('sensor_readings')
        .select('id, latitude, longitude, created_at')
        .eq('user_id', userId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching map locations:', fetchError);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const locations: MapLocation[] = data.map(loc => ({
          id: loc.id,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          isLive: false,
          timestamp: loc.created_at,
          time: formatTime(loc.created_at),
        }));

        // Add current live location if connected
        if (isConnected && latestSensorData && latestSensorData.latitude && latestSensorData.longitude) {
          locations.push({
            latitude: latestSensorData.latitude,
            longitude: latestSensorData.longitude,
            isLive: true,
            timestamp: new Date().toISOString(),
            time: 'Live',
          });
        }

        setMapLocations(locations);
        
        // Center map on most recent location (or first location)
        if (locations.length > 0) {
          const lastLocation = locations[locations.length - 1];
          setCenterLocation({
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
          });
        }
      } else {
        setMapLocations([]);
        
        // If no data, try to center on live location
        if (isConnected && latestSensorData && latestSensorData.latitude && latestSensorData.longitude) {
          setCenterLocation({
            latitude: latestSensorData.latitude,
            longitude: latestSensorData.longitude,
          });
        }
      }
    } catch (err) {
      console.error('Error in fetchMapLocations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch map locations on mount and when connection changes
  useEffect(() => {
    fetchMapLocations();
  }, [isConnected, latestSensorData]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="map" size={28} color={colors.text} />
        <Text style={styles.headerTitle}>Daily Tracking</Text>
        <TouchableOpacity onPress={fetchMapLocations}>
          <Ionicons name="refresh" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {mapLocations.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <Ionicons name="location" size={24} color={colors.primary} />
                <Text style={styles.mapTitle}>Reading Locations</Text>
                <Text style={styles.locationCount}>{mapLocations.length} locations</Text>
              </View>

              {/* Google Map */}
              <View style={styles.mapContainer}>
                <GoogleMap locations={mapLocations} height={400} />
              </View>

              {/* Location Legend */}
              <View style={styles.mapLegend}>
                <View style={styles.legendRow}>
                  <View style={[styles.mapLegendDot, { backgroundColor: '#fb444a' }]} />
                  <Text style={styles.mapLegendText}>Live Location (Connected)</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.mapLegendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.mapLegendText}>Historical Locations</Text>
                </View>
              </View>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  Showing today's data collection points. Tap any marker to see collection time.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <Ionicons name="map-outline" size={80} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Data Today</Text>
            <Text style={styles.emptyDescription}>
              {loading ? 'Loading today\'s data...' : 'No sensor readings collected today. Connect your device and start taking readings to see them on the map.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
