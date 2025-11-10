import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { createSettingsStyles } from '@/styles/settings.styles';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    if (!user) {
      console.error('❌ Load Profile Error: No authenticated user found');
      setLoading(false);
      return;
    }
    
    // Get user ID - AuthContext uses 'uid' property
    const userId = (user as any).uid || (user as any).id;
    
    if (!userId) {
      console.error('❌ Load Profile Error: User ID is undefined. User object:', JSON.stringify(user, null, 2));
      setLoading(false);
      return;
    }
    
    console.log('📥 Loading profile for user:', userId);
    
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('user_name, language')
        .eq('id', userId)
        .single();
      
      // If profile doesn't exist, create it
      if (error && error.code === 'PGRST116') {
        console.log('⚠️ Profile not found (PGRST116), creating new profile...');
        
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            id: userId, 
            user_name: null,
            language: 'english'
          })
          .select();
        
        if (insertError) {
          console.error('❌ Profile Insert Error:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            userId: userId,
            operation: 'insert',
            table: 'profiles'
          });
        } else {
          console.log('✅ Profile created successfully:', insertData);
          setUserName('');
          setLanguage('english');
        }
      } else if (error) {
        console.error('❌ Supabase Load Error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: userId,
          operation: 'select',
          table: 'profiles'
        });
      } else if (data) {
        console.log('✅ Profile loaded successfully:', data);
        setUserName(data.user_name || '');
        setLanguage(data.language || 'english');
      }
    } catch (error: any) {
      console.error('❌ Load Profile Exception:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
        fullError: JSON.stringify(error, null, 2)
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) {
      console.error('❌ Save Profile Error: No authenticated user found');
      Alert.alert('Error', 'No user session found. Please login again.');
      return;
    }
    
    // Get user ID - AuthContext uses 'uid' property
    const userId = (user as any).uid || (user as any).id;
    
    if (!userId) {
      console.error('❌ Save Profile Error: User ID is undefined. User object:', JSON.stringify(user, null, 2));
      Alert.alert('Error', 'User ID not found. Please logout and login again.');
      return;
    }
    
    setSaving(true);
    console.log('💾 Saving profile...', { 
      userId: userId, 
      userName: userName.trim() || null, 
      language 
    });
    
    try {
      // Use upsert with onConflict to ensure it works whether profile exists or not
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          user_name: userName.trim() || null,
          language 
        }, {
          onConflict: 'id'
        })
        .select();
      
      if (error) {
        console.error('❌ Supabase Save Error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: userId,
          operation: 'upsert',
          table: 'profiles'
        });
        throw error;
      }
      
      console.log('✅ Profile saved successfully:', data);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      console.error('❌ Save Profile Exception:', {
        message: errorMessage,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
        fullError: JSON.stringify(error, null, 2)
      });
      Alert.alert('Error', `${errorMessage}\n\nCheck console for details.`);
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

  const styles = createSettingsStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="settings" size={28} color={colors.text} />
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* User Info */}
            <View style={styles.section}>
              <View style={styles.userInfo}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarText, { color: theme === 'dark' ? colors.text : '#2C2C2C' }]}>
                    {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{userName || 'User Account'}</Text>
                  <Text style={styles.userEmail}>{user?.email || 'Not logged in'}</Text>
                </View>
              </View>
            </View>

            {/* Username */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Language */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Language</Text>
              <TouchableOpacity 
                style={[styles.languageOption, language === 'english' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => setLanguage('english')}
              >
                <Text style={styles.languageText}>English</Text>
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
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={24} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Theme</Text>
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

