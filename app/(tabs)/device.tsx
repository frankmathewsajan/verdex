import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeviceScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="radio" size={28} color="#e0daca" />
        <Text style={styles.headerTitle}>Device</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.content}>
        <Ionicons name="hardware-chip-outline" size={64} color="#9e9c93" />
        <Text style={styles.title}>Device</Text>
        <Text style={styles.subtitle}>Manage your sensors</Text>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0daca',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#9e9c93',
    marginTop: 8,
  },
});
