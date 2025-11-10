import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const { user } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('english');
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    setSaving(true);
    try {
      const userId = (user as any)?.uid || (user as any)?.id;
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          user_name: name.trim(),
          language,
          onboarding_completed: true
        }, { onConflict: 'id' });

      if (error) throw error;
      
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const themedStyles = styles(colors);

  return (
    <SafeAreaView style={themedStyles.container}>
      <View style={themedStyles.content}>
        <View style={themedStyles.progress}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[themedStyles.progressDot, i <= step && themedStyles.progressDotActive]} />
          ))}
        </View>

        {step === 1 && (
          <View style={themedStyles.stepContainer}>
            <Ionicons name="person-outline" size={64} color={colors.primary} />
            <Text style={themedStyles.title}>What's your name?</Text>
            <TextInput
              style={themedStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <TouchableOpacity
              style={[themedStyles.button, !name.trim() && themedStyles.buttonDisabled]}
              onPress={() => setStep(2)}
              disabled={!name.trim()}
            >
              <Text style={themedStyles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={themedStyles.stepContainer}>
            <Ionicons name="language-outline" size={64} color={colors.primary} />
            <Text style={themedStyles.title}>Choose Language</Text>
            <TouchableOpacity
              style={[themedStyles.option, language === 'english' && themedStyles.optionActive]}
              onPress={() => setLanguage('english')}
            >
              <Text style={themedStyles.optionText}>English</Text>
              {language === 'english' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity style={[themedStyles.option, { opacity: 0.5 }]} disabled>
              <Text style={[themedStyles.optionText, { color: colors.textSecondary }]}>Hindi (Coming Soon)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={themedStyles.button}
              onPress={() => setStep(3)}
            >
              <Text style={themedStyles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={themedStyles.stepContainer}>
            <Ionicons name="color-palette-outline" size={64} color={colors.primary} />
            <Text style={themedStyles.title}>Choose Theme</Text>
            <TouchableOpacity
              style={[themedStyles.option, theme === 'light' && themedStyles.optionActive]}
              onPress={() => theme === 'dark' && toggleTheme()}
            >
              <Ionicons name="sunny" size={24} color={colors.text} />
              <Text style={themedStyles.optionText}>Light Mode</Text>
              {theme === 'light' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[themedStyles.option, theme === 'dark' && themedStyles.optionActive]}
              onPress={() => theme === 'light' && toggleTheme()}
            >
              <Ionicons name="moon" size={24} color={colors.text} />
              <Text style={themedStyles.optionText}>Dark Mode</Text>
              {theme === 'dark' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={themedStyles.button}
              onPress={handleComplete}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={themedStyles.buttonText}>Get Started</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
