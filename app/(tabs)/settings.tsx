import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('user_name, language')
        .eq('id', (user as any).id)
        .single();
      
      // If profile doesn't exist, create it
      if (error && error.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            id: (user as any).id, 
            user_name: null,
            language: 'english'
          });
        
        if (!insertError) {
          setUserName('');
          setLanguage('english');
        }
      } else if (data) {
        setUserName(data.user_name || '');
        setLanguage(data.language || 'english');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Use upsert with onConflict to ensure it works whether profile exists or not
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: (user as any).id, 
          user_name: userName.trim() || null,
          language 
        }, {
          onConflict: 'id'
        });
      
      if (error) throw error;
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
      console.error('Save profile error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        }}
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Ionicons name="settings" size={28} color={colors.text} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* User Info */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.userInfo}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarText, { color: theme === 'dark' ? colors.text : '#2C2C2C' }]}>
                    {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={[styles.userName, { color: colors.text }]}>{userName || 'User Account'}</Text>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || 'Not logged in'}</Text>
                </View>
              </View>
            </View>

            {/* Username */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Display Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Language */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Language</Text>
              <TouchableOpacity 
                style={[styles.languageOption, language === 'english' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => setLanguage('english')}
              >
                <Text style={[styles.languageText, { color: colors.text }]}>English</Text>
                {language === 'english' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.languageOption, { opacity: 0.5 }]}
                disabled
              >
                <Text style={[styles.languageText, { color: colors.textSecondary }]}>Hindi (Coming Soon)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.languageOption, { opacity: 0.5 }]}
                disabled
              >
                <Text style={[styles.languageText, { color: colors.textSecondary }]}>Telugu (Coming Soon)</Text>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.success }]} 
              onPress={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#ffffff" />
                  <Text style={styles.saveText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Theme Toggle */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={24} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#FFD700', true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.error }]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#ffffff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  content: { flex: 1, padding: 16 },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: 'bold' },
  userDetails: { flex: 1 },
  userName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  userEmail: { fontSize: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  settingDesc: { fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageText: { fontSize: 15, fontWeight: '500' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  saveText: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
});
