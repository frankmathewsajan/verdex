import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/utils/supabase';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }

    try {
      const userId = (user as any)?.uid || (user as any)?.id;
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      setNeedsOnboarding(!data?.onboarding_completed);
    } catch (error) {
      console.error('Error checking onboarding:', error);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  if (isLoading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#303135' }}>
        <ActivityIndicator size="large" color="#fb444a" />
      </View>
    );
  }
  
  if (user) {
    if (needsOnboarding) {
      return <Redirect href="/(auth)/onboarding" />;
    }
    return <Redirect href="/(tabs)/home" />;
  }
  
  return <Redirect href="/(auth)/login" />;
}
