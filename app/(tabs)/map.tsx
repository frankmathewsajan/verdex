import GoogleMap from '@/components/google-map';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { useTheme } from '@/contexts/theme-context';
import { createMapStyles } from '@/styles/map.styles';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  const { colors } = useTheme();
  const { latestSensorData, isConnected } = useBluetooth();
  const [mapLocations, setMapLocations] = useState<Array<{
    latitude: number;
    longitude: number;
    isLive: boolean;
  }>>([]);
  const styles = createMapStyles(colors);

  // Fetch map locations from database
  const fetchMapLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const userId = (user as any)?.uid || (user as any)?.id;

      const { data, error: fetchError } = await supabase
        .from('sensor_readings')
        .select('latitude, longitude')
        .eq('user_id', userId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100); // Get last 100 locations

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
                  Tap any marker to view detailed sensor readings at that location
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <Ionicons name="map-outline" size={80} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Locations Yet</Text>
            <Text style={styles.emptyDescription}>
              Connect your sensor device and start taking readings to see them on the map
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
