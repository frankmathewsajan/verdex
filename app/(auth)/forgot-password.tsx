import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await resetPassword(email);
      setSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background}>
        <View style={styles.content}>
          <View style={styles.form}>
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#e0daca" />
            </TouchableOpacity>

            {/* Header */}
            <Text style={styles.title}>VERDEX v1.0</Text>
            <Text style={styles.subtitle}>Reset Your Password</Text>

            {!sent ? (
              <>
                <Text style={styles.description}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#e0daca80"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                {/* Reset Button */}
                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={handleResetPassword}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetButtonText}>SEND RESET LINK</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#4ade80" />
                  <Text style={styles.successTitle}>Email Sent!</Text>
                  <Text style={styles.successText}>
                    Check your email for password reset instructions.
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={() => router.replace('/(auth)/login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetButtonText}>BACK TO LOGIN</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Remember your password? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
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
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
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
    paddingBottom: 16,
    paddingTop: 4,
  },
  description: {
    fontSize: 14,
    color: '#e0daca',
    textAlign: 'center',
    paddingBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
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
  resetButton: {
    backgroundColor: '#fb444a',
    borderRadius: 6,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resetButtonText: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 3,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0daca',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#e0daca',
    textAlign: 'center',
    lineHeight: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  loginText: {
    fontSize: 14,
    color: '#e0daca',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e0daca',
    textDecorationLine: 'underline',
  },
});
