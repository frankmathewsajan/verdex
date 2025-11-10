import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { createRecommendationStyles } from '@/styles/recommendation.styles';
import { sendPrescriptionSMS } from '@/utils/messaging';
import { generateRecommendationReport, shareReport } from '@/utils/report-generator';
import { supabase } from '@/utils/supabase';
import { pauseSpeaking, resumeSpeaking, speakPrescription, stopSpeaking } from '@/utils/voice';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SensorReading {
  id: string;
  created_at: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  pH?: number;
  moisture: number;
  temperature: number;
}

interface Crop {
  id: string;
  name: string;
  icon: string;
  emoji: string;
}

interface Recommendation {
  type: string;
  description: string;
  amount?: string;
}

const CROPS: Crop[] = [
  { id: 'paddy', name: 'Paddy', icon: '🌾', emoji: '🌾' },
  { id: 'cotton', name: 'Cotton', icon: '☁️', emoji: '☁️' },
  { id: 'tomato', name: 'Tomato', icon: '🍅', emoji: '🍅' },
  { id: 'chili', name: 'Chili', icon: '🌶️', emoji: '🌶️' },
  { id: 'maize', name: 'Maize', icon: '🌽', emoji: '🌽' },
  { id: 'pulses', name: 'Pulses', icon: '🫘', emoji: '🫘' },
];

export default function RecommendationScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = createRecommendationStyles(colors);
  
  const [view, setView] = useState<'selection' | 'prescription'>('selection');
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [mostRecentData, setMostRecentData] = useState<SensorReading | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);

  // Auto-stop audio when leaving screen
  useEffect(() => {
    return () => {
      if (speaking) {
        stopSpeaking();
      }
    };
  }, [speaking]);

  // Fetch most recent sensor data
  useEffect(() => {
    fetchMostRecentData();
  }, [user]);

  const fetchMostRecentData = async () => {
    if (!user) return;
    
    setFetchingData(true);
    try {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching recent data:', error);
        setFetchingData(false);
        return;
      }

      setMostRecentData(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setFetchingData(false);
    }
  };

  const generateRecommendations = (crop: Crop, data: SensorReading): Recommendation[] => {
    const ph = data.pH || data.ph || 0;
    const recs: Recommendation[] = [];

    // Nitrogen recommendations
    if (data.nitrogen < 200) {
      recs.push({
        type: 'Nitrogen Fertilizer',
        description: 'Apply Urea (46-0-0)',
        amount: `${Math.round((200 - data.nitrogen) * 2.17)} kg/acre`
      });
    } else if (data.nitrogen > 400) {
      recs.push({
        type: 'Nitrogen Management',
        description: 'Reduce nitrogen application',
        amount: 'Skip this season'
      });
    }

    // Phosphorus recommendations
    if (data.phosphorus < 40) {
      recs.push({
        type: 'Phosphorus Fertilizer',
        description: 'Apply DAP (18-46-0)',
        amount: `${Math.round((40 - data.phosphorus) * 2.17)} kg/acre`
      });
    }

    // Potassium recommendations
    if (data.potassium < 150) {
      recs.push({
        type: 'Potassium Fertilizer',
        description: 'Apply Muriate of Potash (0-0-60)',
        amount: `${Math.round((150 - data.potassium) * 1.67)} kg/acre`
      });
    }

    // pH recommendations
    if (ph < 6.0) {
      recs.push({
        type: 'Soil pH Adjustment',
        description: 'Apply Agricultural Lime',
        amount: `${Math.round((6.5 - ph) * 500)} kg/acre`
      });
    } else if (ph > 7.5) {
      recs.push({
        type: 'Soil pH Adjustment',
        description: 'Apply Elemental Sulfur',
        amount: `${Math.round((ph - 7.0) * 100)} kg/acre`
      });
    }

    // Micronutrients
    if (data.nitrogen > 250 && data.phosphorus > 45 && data.potassium > 180) {
      recs.push({
        type: 'Micronutrient Mix',
        description: 'Apply Zinc, Boron, and Iron chelates',
        amount: '5 kg/acre'
      });
    }

    // Crop-specific recommendations
    switch (crop.id) {
      case 'paddy':
        recs.push({
          type: 'NPK Complex',
          description: 'Apply 20-20-0 at transplanting',
          amount: '50 kg/acre'
        });
        break;
      case 'cotton':
        recs.push({
          type: 'Potash Boost',
          description: 'Additional potash at flowering',
          amount: '25 kg/acre'
        });
        break;
      case 'tomato':
        recs.push({
          type: 'Calcium Supplement',
          description: 'Apply Calcium Nitrate',
          amount: '20 kg/acre'
        });
        break;
    }

    return recs;
  };

  const handleCropSelect = (crop: Crop) => {
    if (!mostRecentData) {
      Alert.alert('No Data', 'No recent soil data found. Please take a reading first.');
      return;
    }

    setSelectedCrop(crop);
    setLoading(true);

    // Simulate backend calculation
    setTimeout(() => {
      const recs = generateRecommendations(crop, mostRecentData);
      setRecommendations(recs);
      setLoading(false);
      setView('prescription');
    }, 800);
  };

  const handleGenerateReport = async () => {
    if (!mostRecentData || !selectedCrop || !user) return;
    
    setGeneratingReport(true);
    try {
      const uri = await generateRecommendationReport({
        userName: user.user_name || user.email || 'Farmer',
        data: mostRecentData,
        recommendations,
      });
      await shareReport(uri, `Verdex_Prescription_${selectedCrop.name}.pdf`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleReadAloud = async () => {
    if (!mostRecentData || !user) return;
    
    setSpeaking(true);
    setIsPaused(false);
    try {
      const language = user.language || 'english';
      await speakPrescription({
        language: language as 'english' | 'hindi' | 'telugu',
        data: mostRecentData,
        recommendations,
      });
      // Audio finished naturally
      setSpeaking(false);
      setIsPaused(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to read prescription aloud');
      setSpeaking(false);
      setIsPaused(false);
    }
  };

  const handlePauseAudio = async () => {
    try {
      await pauseSpeaking();
      setIsPaused(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to pause audio');
    }
  };

  const handleResumeAudio = async () => {
    try {
      await resumeSpeaking();
      setIsPaused(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to resume audio');
    }
  };

  const handleStopAudio = async () => {
    try {
      await stopSpeaking();
      setSpeaking(false);
      setIsPaused(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop audio');
    }
  };

  const handleSendSMS = async () => {
    if (!mostRecentData || !user) return;
    
    setSendingSMS(true);
    try {
      const language = user.language || 'english';
      await sendPrescriptionSMS({
        phoneNumber: '', // Opens SMS composer without preset number
        language: language as 'english' | 'hindi' | 'telugu',
        data: mostRecentData,
        recommendations,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send SMS');
    } finally {
      setSendingSMS(false);
    }
  };

  if (fetchingData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Ionicons name="leaf" size={28} color={colors.text} />
          <Text style={styles.headerTitle}>Recommendation</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading soil data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!mostRecentData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Ionicons name="leaf" size={28} color={colors.text} />
          <Text style={styles.headerTitle}>Recommendation</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="flask-outline" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Soil Data</Text>
          <Text style={styles.emptyDescription}>
            Take a soil reading first to get personalized fertilizer recommendations.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {view === 'prescription' ? (
          <TouchableOpacity onPress={() => setView('selection')}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="leaf" size={28} color={colors.text} />
        )}
        <Text style={styles.headerTitle}>
          {view === 'selection' ? 'Select Crop' : 'Prescription'}
        </Text>
        
        {view === 'prescription' ? (
          <View style={styles.headerActions}>
            {/* Message Button */}
            <TouchableOpacity
              style={[styles.headerActionButton, sendingSMS && styles.headerActionButtonDisabled]}
              onPress={handleSendSMS}
              disabled={sendingSMS}
            >
              <Ionicons
                name={sendingSMS ? 'chatbubble' : 'chatbubble-outline'}
                size={22}
                color={sendingSMS ? colors.textSecondary : colors.text}
              />
            </TouchableOpacity>

            {/* Report Button */}
            <TouchableOpacity
              style={[styles.headerActionButton, generatingReport && styles.headerActionButtonDisabled]}
              onPress={handleGenerateReport}
              disabled={generatingReport}
            >
              <Ionicons
                name={generatingReport ? 'document-text' : 'document-text-outline'}
                size={22}
                color={generatingReport ? colors.textSecondary : colors.text}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {view === 'selection' ? (
        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Crop</Text>
            <Text style={styles.sectionSubtitle}>
              Select the crop you plan to grow for tailored recommendations
            </Text>

            <View style={styles.cropGrid}>
              {CROPS.map((crop) => (
                <TouchableOpacity
                  key={crop.id}
                  style={[styles.cropCard, { backgroundColor: colors.card }]}
                  onPress={() => handleCropSelect(crop)}
                  disabled={loading}
                >
                  <Text style={styles.cropEmoji}>{crop.emoji}</Text>
                  <Text style={styles.cropName}>{crop.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addCropButton, { borderColor: colors.border }]}
              disabled
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.textSecondary} />
              <Text style={[styles.addCropText, { color: colors.textSecondary }]}>
                Add Custom Crop
              </Text>
              <Text style={styles.comingSoonBadge}>Soon</Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Generating recommendations...</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.prescriptionScroll}>
          <View style={styles.prescriptionContainer}>
              {/* Header */}
              <View style={[styles.prescriptionHeader, { backgroundColor: colors.primary + '15' }]}>
                <Text style={styles.prescriptionEmoji}>{selectedCrop?.emoji}</Text>
                <Text style={styles.prescriptionTitle}>
                  Recommendations for: {selectedCrop?.name}
                </Text>
              </View>

              {/* Data Context */}
              <View style={[styles.dataContext, { backgroundColor: colors.card }]}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dataContextLabel}>Based on soil data from:</Text>
                  <Text style={styles.dataContextValue}>
                    {new Date(mostRecentData.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </Text>
                </View>
              </View>

              {/* Prescription List */}
              <View style={styles.prescriptionList}>
                <Text style={styles.listTitle}>Prescription</Text>
                {recommendations.map((rec, index) => (
                  <View key={index} style={[styles.prescriptionItem, { backgroundColor: colors.card }]}>
                    <View style={styles.itemHeader}>
                      <View style={[styles.itemNumber, { backgroundColor: colors.primary }]}>
                        <Text style={styles.itemNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.itemType}>{rec.type}</Text>
                    </View>
                    <Text style={styles.itemDescription}>{rec.description}</Text>
                    {rec.amount && (
                      <View style={[styles.itemAmount, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="scale-outline" size={16} color={colors.primary} />
                        <Text style={[styles.itemAmountText, { color: colors.primary }]}>
                          {rec.amount}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Important Notes */}
              <View style={[styles.notesSection, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notesTitle}>Important Notes</Text>
                  <Text style={styles.notesText}>
                    • Follow recommended application rates carefully{'\n'}
                    • Apply fertilizers during appropriate growth stages{'\n'}
                    • Water adequately after application{'\n'}
                    • Consult local agricultural extension for specific guidance
                  </Text>
                </View>
              </View>
          </View>
        </ScrollView>
      )}

      {/* Floating Audio Player - Bottom Right */}
      {view === 'prescription' && (
        <View style={styles.floatingAudioPlayer}>
          {!speaking ? (
            <View style={styles.audioPlayerWrapper}>
              {/* Play Button */}
              <TouchableOpacity
                style={[styles.audioPlayerButton, { backgroundColor: 'rgba(34, 197, 94, 0.9)' }]}
                onPress={handleReadAloud}
              >
                <Ionicons name="play" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.audioPlayerLabel}>
                Listen
              </Text>
            </View>
          ) : (
            /* Audio Controls */
            <View>
              <View style={styles.audioPlayerControls}>
                {/* Pause/Resume Button */}
                <TouchableOpacity
                  style={[styles.audioPlayerButton, { backgroundColor: 'rgba(34, 197, 94, 0.9)' }]}
                  onPress={isPaused ? handleResumeAudio : handlePauseAudio}
                >
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>

                {/* Stop Button */}
                <TouchableOpacity
                  style={[styles.audioPlayerButton, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}
                  onPress={handleStopAudio}
                >
                  <Ionicons name="stop" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {/* Status Text */}
              <Text style={styles.audioPlayerStatus}>
                {isPaused ? 'Paused' : 'Playing...'}
              </Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
