import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';

export default function DashboardScreen() {
  const { signOut } = useAuth();

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
        {/* Current Readings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Readings</Text>
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Nitrogen (N)</Text>
              <Text style={styles.cardValue}>120 ppm</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Phosphorus (P)</Text>
              <Text style={styles.cardValue}>55 ppm</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Potassium (K)</Text>
              <Text style={styles.cardValue}>150 ppm</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>pH Level</Text>
              <Text style={styles.cardValue}>6.8</Text>
            </View>
          </View>
        </View>

        {/* 24-Hour Trends */}
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

        {/* 10-Hour Forecast */}
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

        {/* Alerts */}
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

        {/* Key Metrics */}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0daca',
    marginBottom: 12,
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
});
