import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { createHomeStyles } from '@/styles/home.styles';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface QuickStats {
  totalReadings: number;
  uniqueLocations: number;
  lastSync: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const [stats, setStats] = useState<QuickStats>({
    totalReadings: 0,
    uniqueLocations: 0,
    lastSync: '--',
  });

  const menuItems = [
    {
      id: 'present',
      title: 'Present',
      subtitle: 'Live Data',
      icon: 'radio',
      route: '/(tabs)/present',
      gradient: ['#4ade80', '#22c55e'],
      iconBg: '#dcfce7',
    },
    {
      id: 'history',
      title: 'History',
      subtitle: 'Data & Trends',
      icon: 'analytics',
      route: '/(tabs)/history',
      gradient: ['#60a5fa', '#3b82f6'],
      iconBg: '#dbeafe',
    },
    {
      id: 'map',
      title: 'Map',
      subtitle: 'Daily Tracking',
      icon: 'map',
      route: '/(tabs)/map',
      gradient: ['#f87171', '#ef4444'],
      iconBg: '#fee2e2',
    },
    {
      id: 'recommendation',
      title: 'Recommend',
      subtitle: 'Fertilizer Rx',
      icon: 'leaf',
      route: '/(tabs)/recommendation',
      gradient: ['#facc15', '#eab308'],
      iconBg: '#fef9c3',
    },
  ];

  const styles = createHomeStyles(colors, theme);

  // Fetch statistics from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const userId = (authUser as any)?.uid || (authUser as any)?.id;

        // Get total readings count
        const { count: readingsCount } = await supabase
          .from('sensor_readings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        // Get unique locations count
        const { data: locationsData } = await supabase
          .from('sensor_readings')
          .select('latitude, longitude')
          .eq('user_id', userId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        // Count unique locations (round to 4 decimal places)
        const uniqueLocations = locationsData 
          ? new Set(
              locationsData.map(loc => 
                `${loc.latitude?.toFixed(4)},${loc.longitude?.toFixed(4)}`
              )
            ).size
          : 0;

        // Get last sync time
        const { data: lastReading } = await supabase
          .from('sensor_readings')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const formatLastSync = (isoString: string) => {
          const date = new Date(isoString);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) return 'Just now';
          if (diffMins < 60) return `${diffMins}m ago`;
          if (diffHours < 24) return `${diffHours}h ago`;
          if (diffDays < 7) return `${diffDays}d ago`;
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        setStats({
          totalReadings: readingsCount || 0,
          uniqueLocations: uniqueLocations,
          lastSync: lastReading ? formatLastSync(lastReading.created_at) : '--',
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="leaf" size={20} color={colors.primary} />
          </View>
          <Text style={styles.logoText}>VERDEX</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => router.push('/(tabs)/device')}
          >
            <Ionicons name="bluetooth" size={18} color="#fff" />
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Welcome Section with Quick Overview */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeLabel}>Welcome back</Text>
          <Text style={styles.userName}>
            {user?.user_name || 'User'}
          </Text>
          
          <Text style={styles.overviewHeading}>Quick Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="cloud-upload-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statValue}>{stats.totalReadings}</Text>
              <Text style={styles.statLabel}>Readings</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statValue}>{stats.uniqueLocations}</Text>
              <Text style={styles.statLabel}>Locations</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statValue}>{stats.lastSync}</Text>
              <Text style={styles.statLabel}>Last Sync</Text>
            </View>
          </View>
        </View>

        {/* Services Section */}
        <Text style={styles.servicesHeading}>Services</Text>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                { backgroundColor: theme === 'dark' ? item.gradient[1] + '20' : item.iconBg }
              ]}>
                <Ionicons 
                  name={item.icon as any} 
                  size={24} 
                  color={item.gradient[1]} 
                />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              <View style={[styles.cardAccent, { backgroundColor: item.gradient[1] }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
