import { useTheme } from '@/contexts/theme-context';
import { createRecommendationStyles } from '@/styles/recommendation.styles';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecommendationScreen() {
  const { colors } = useTheme();
  const styles = createRecommendationStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="leaf" size={28} color={colors.text} />
        <Text style={styles.headerTitle}>Recommendation</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Ionicons name="leaf-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.title}>Fertilizer Prescription</Text>
        <Text style={styles.description}>
          Get AI-powered fertilizer recommendations based on your soil data. 
          Optimize crop yield with personalized nutrient management plans.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
