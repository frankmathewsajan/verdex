import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      
      // Check if user completed onboarding
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', userId)
          .single();
        
        if (!profile?.onboarding_completed) {
          router.replace('/(auth)/onboarding');
          return;
        }
      }
      
      router.replace('/(tabs)/home' as any);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.background, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.form}>
            {/* Header */}
            <Text style={[styles.title, { color: colors.text }]}>VERDEX v1.0</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>Access Your Soil Data</Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Username / Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                placeholder="Enter your username or email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View style={[styles.passwordContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={24} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <View style={styles.forgotContainer}>
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: colors.error }, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>{loading ? 'LOGGING IN...' : 'LOGIN'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#303135',
  },
  background: {
    flex: 1,
    backgroundColor: '#303135',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  form: {
    width: '100%',
    maxWidth: 384,
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 36,
    color: '#e0daca',
    textAlign: 'center',
    letterSpacing: 2,
    paddingBottom: 12,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0daca',
    textAlign: 'center',
    paddingBottom: 32,
    paddingTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e0daca',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#46474a',
    borderRadius: 6,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#e0daca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#46474a',
    borderRadius: 6,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#e0daca',
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  forgotText: {
    fontSize: 14,
    color: '#e0daca',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#fb444a',
    borderRadius: 6,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 3,
  },
});
