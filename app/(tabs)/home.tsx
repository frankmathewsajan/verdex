import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { createHomeStyles } from '@/styles/home.styles';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors, theme } = useTheme();

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
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Readings</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Locations</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statValue}>--</Text>
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
