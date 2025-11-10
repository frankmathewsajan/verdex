import { useBluetooth } from '@/contexts/bluetooth-context';
import { useTheme } from '@/contexts/theme-context';
import { createPresentStyles } from '@/styles/present.styles';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

interface ParameterData {
  name: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  optimal: { min: number; max: number };
  icon: string;
}

interface SensorReading {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  moisture: number;
  temperature: number;
  humidity?: number;
}

export default function PresentScreen() {
  const { latestSensorData, isConnected, isDataValid } = useBluetooth();
  const { colors } = useTheme();
  const [isBlinking, setIsBlinking] = useState(false);
  const [dbReading, setDbReading] = useState<SensorReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = createPresentStyles(colors);

  // Fetch latest reading from Supabase
  useEffect(() => {
    fetchLatestReading();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchLatestReading, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLatestReading = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try API endpoint first
      try {
        const response = await fetch('https://kdlhvlpoldivrweyjrfg.supabase.co/functions/v1/latest-soil-readings');
        if (response.ok) {
          const data = await response.json();
          if (data && data.nitrogen !== undefined) {
            setDbReading(data);
            setLoading(false);
            return;
          }
        }
      } catch (apiError) {
        console.log('API endpoint failed, trying database directly');
      }

      // Fallback to database query
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('sensor_readings')
        .select('nitrogen, phosphorus, potassium, ph, moisture, temperature, humidity')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dbError) {
        if (dbError.code === 'PGRST116') {
          // No data found
          setDbReading(null);
        } else {
          throw dbError;
        }
      } else if (data) {
        setDbReading(data);
      }
    } catch (err) {
      console.error('Error fetching latest reading:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && isDataValid) {
      const interval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected, isDataValid]);

  const getHealthPercentage = (value: number | null, optimal: { min: number; max: number }, min: number, max: number): number => {
    if (value === null) return 0;
    if (value >= optimal.min && value <= optimal.max) return 100;
    if (value < optimal.min) {
      const range = optimal.min - min;
      const distance = optimal.min - value;
      return Math.max(0, Math.round(100 - (distance / range) * 100));
    }
    const range = max - optimal.max;
    const distance = value - optimal.max;
    return Math.max(0, Math.round(100 - (distance / range) * 100));
  };

  // Battery colors matching the image: Red -> Orange -> Yellow -> Light Green -> Green
  const getHealthColor = (percentage: number): string => {
    if (percentage >= 90) return '#22c55e'; // Full green (rightmost battery)
    if (percentage >= 75) return '#4ade80'; // Bright green
    if (percentage >= 60) return '#84cc16'; // Yellow-green
    if (percentage >= 45) return '#eab308'; // Yellow (middle battery)
    if (percentage >= 25) return '#f97316'; // Orange (2nd battery)
    return '#dc2626'; // Red (leftmost battery - critical)
  };

  // Use Bluetooth data if available and valid, otherwise use database data
  const currentData = (isConnected && isDataValid) ? latestSensorData : dbReading;
  const hasData = currentData !== null;

  // Helper to get pH value (handles both 'pH' and 'ph' properties)
  const getPhValue = () => {
    if (!currentData) return null;
    if ('pH' in currentData) return currentData.pH;
    if ('ph' in currentData) return (currentData as any).ph;
    return null;
  };

  const parameters: ParameterData[] = [
    { name: 'Nitrogen (N)', value: currentData?.nitrogen ?? null, unit: '%', min: 0, max: 10, optimal: { min: 1.5, max: 3.5 }, icon: 'flask' },
    { name: 'Phosphorus (P)', value: currentData?.phosphorus ?? null, unit: '%', min: 0, max: 5, optimal: { min: 0.5, max: 1.5 }, icon: 'flask-outline' },
    { name: 'Potassium (K)', value: currentData?.potassium ?? null, unit: '%', min: 0, max: 10, optimal: { min: 1.0, max: 3.0 }, icon: 'flask' },
    { name: 'pH Level', value: getPhValue(), unit: 'pH', min: 0, max: 14, optimal: { min: 6.0, max: 7.5 }, icon: 'water' },
    { name: 'Moisture', value: currentData?.moisture ?? null, unit: '%', min: 0, max: 100, optimal: { min: 40, max: 60 }, icon: 'water-outline' },
    { name: 'Temperature', value: currentData?.temperature ?? null, unit: '°C', min: -10, max: 50, optimal: { min: 20, max: 30 }, icon: 'thermometer' },
  ];

  const validParameters = parameters.filter(p => p.value !== null);
  const totalValue = validParameters.reduce((sum, p) => sum + (p.value || 0), 0);
  
  const pieData = validParameters.map((param) => {
    const percentage = totalValue > 0 ? ((param.value || 0) / totalValue) * 100 : 0;
    const healthPercentage = getHealthPercentage(param.value, param.optimal, param.min, param.max);
    return { name: param.name, value: param.value, percentage, color: getHealthColor(healthPercentage) };
  });

  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  const polarToCartesian = (angle: number, r: number) => {
    const angleInRadians = (angle * Math.PI) / 180;
    return { x: centerX + r * Math.cos(angleInRadians), y: centerY + r * Math.sin(angleInRadians) };
  };

  // Show loading state
  if (loading && !isConnected) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Data</Text>
          <Text style={styles.headerSubtitle}>Real-time soil parameter monitoring</Text>
        </View>
        <View style={styles.noDataContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.noDataText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header similar to home page */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveIndicatorContainer}>
            {isConnected && isDataValid && (
              <View style={[styles.liveDot, { opacity: isBlinking ? 1 : 0.3 }]} />
            )}
          </View>
          <View>
            <Text style={styles.headerTitle}>Present</Text>
            <Text style={styles.headerSubtitle}>
              {isConnected && isDataValid ? 'Live from device' : hasData ? 'Latest reading' : 'No data'}
            </Text>
          </View>
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
            onPress={fetchLatestReading}
          >
            <Ionicons name="refresh" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      {hasData ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.parametersGrid}>
              {parameters.map((param, index) => {
                const healthPercentage = getHealthPercentage(param.value, param.optimal, param.min, param.max);
                const healthColor = getHealthColor(healthPercentage);
                return (
                  <View key={index} style={styles.parameterCard}>
                    <Text style={styles.parameterName}>{param.name}</Text>
                    <View style={styles.batteryContainer}>
                      <View style={styles.batteryTip} />
                      <View style={[styles.batteryFill, { width: `${healthPercentage}%`, backgroundColor: healthColor }]} />
                    </View>
                    <Text style={styles.parameterValue}>{param.value !== null ? param.value.toFixed(1) : '--'}</Text>
                    <Text style={styles.parameterUnit}>{param.unit}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.chartSection}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Parameter Distribution</Text>
              </View>
              <View style={styles.pieChartContainer}>
                <Svg width="200" height="200">
                  {pieData.map((segment, index) => {
                    let currentAngle = -90;
                    for (let i = 0; i < index; i++) { currentAngle += (pieData[i].percentage / 100) * 360; }
                    const angle = (segment.percentage / 100) * 360;
                    const startPoint = polarToCartesian(currentAngle, radius);
                    const endPoint = polarToCartesian(currentAngle + angle, radius);
                    const largeArcFlag = angle > 180 ? 1 : 0;
                    const pathData = [`M ${centerX} ${centerY}`, `L ${startPoint.x} ${startPoint.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`, 'Z'].join(' ');
                    return <Path key={index} d={pathData} fill={segment.color} opacity={0.8} />;
                  })}
                  <Circle cx={centerX} cy={centerY} r={40} fill={colors.card} />
                  <SvgText x={centerX} y={centerY} textAnchor="middle" dy="0.3em" fontSize="16" fontWeight="bold" fill={colors.text}>{validParameters.length}</SvgText>
                  <SvgText x={centerX} y={centerY + 16} textAnchor="middle" fontSize="10" fill={colors.textSecondary}>params</SvgText>
                </Svg>
              </View>
              <View style={styles.chartLegend}>
                {pieData.map((segment, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                      <Text style={styles.legendLabel}>{segment.name}</Text>
                    </View>
                    <Text style={styles.legendValue}>{segment.value?.toFixed(1)} ({segment.percentage.toFixed(0)}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.noDataText}>
            {error ? error : 'No soil data available'}
          </Text>
          <Text style={[styles.noDataText, { fontSize: 14, marginTop: 8 }]}>
            Connect a device or take a reading to see data
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 }}
            onPress={() => router.push('/(tabs)/device')}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Connect Device</Text>
          </TouchableOpacity>
          {error && (
            <TouchableOpacity 
              style={{ backgroundColor: colors.textSecondary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 12 }}
              onPress={fetchLatestReading}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
