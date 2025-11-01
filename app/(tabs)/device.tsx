import { useBluetooth } from '@/contexts/bluetooth-context';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScannedDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

interface SensorData {
  latitude: number | null;
  longitude: number | null;
  satelliteCount: number | null;
  bearing: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  pH: number | null;
  moisture: number | null;
  // Optional fields
  temperature?: number | null;
  humidity?: number | null;
  soilConductivity?: number | null;
}

interface SensorReading extends SensorData {
  timestamp: Date;
  deviceId: string;
  deviceName: string;
}

export default function DeviceScreen() {
  const { latestSensorData, isConnected, connectedDevice, connectToDevice: connectDeviceInContext, disconnectDevice: disconnectDeviceInContext, isDataValid } = useBluetooth();
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [showAllDevices, setShowAllDevices] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [serialData, setSerialData] = useState<string>('');
  const [sensorData, setSensorData] = useState<SensorData>({
    latitude: null,
    longitude: null,
    satelliteCount: null,
    bearing: null,
    nitrogen: null,
    phosphorus: null,
    potassium: null,
    pH: null,
    moisture: null,
    temperature: null,
    humidity: null,
    soilConductivity: null,
  });
  const [sensorBatch, setSensorBatch] = useState<SensorReading[]>([]);
  const [previousSensorData, setPreviousSensorData] = useState<SensorData | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [bluetoothState, setBluetoothState] = useState<string>('Unknown');
  const [isSerialExpanded, setIsSerialExpanded] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    checkBluetoothPermissions();
    checkBluetoothState();
    
    return () => {
      stopScanning();
    };
  }, []);

  // Watch for new sensor data from context and update local state + batch
  useEffect(() => {
    if (latestSensorData && isConnected) {
      // Update local sensor data display
      setSensorData(latestSensorData);
      
      // Only add to batch if data is valid (real GPS coordinates)
      if (isDataValid) {
        addToBatch(latestSensorData);
      } else {
        console.log('⏭️ Skipping invalid data from batch (GPS coordinates are zero)');
      }
    }
  }, [latestSensorData, isConnected, isDataValid]);

  const checkBluetoothState = async () => {
    try {
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      setBluetoothState(isEnabled ? 'PoweredOn' : 'PoweredOff');
      console.log('Classic Bluetooth enabled:', isEnabled);
    } catch (error) {
      console.error('Error checking Bluetooth state:', error);
      setBluetoothState('Unknown');
    }
  };

  const checkBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        console.log('Android API Level:', apiLevel);
        
        if (apiLevel >= 31) {
          // Android 12+ (API 31+)
          console.log('Requesting Android 12+ permissions...');
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          
          console.log('Permission results:', granted);
          
          const allGranted = Object.values(granted).every(
            status => status === PermissionsAndroid.RESULTS.GRANTED
          );
          
          if (!allGranted) {
            Alert.alert(
              'Permissions Required',
              'Bluetooth and Location permissions are required for device discovery. Please grant all permissions.',
              [{ text: 'OK' }]
            );
          }
          
          setHasPermissions(allGranted);
        } else if (apiLevel >= 23) {
          // Android 6-11 (API 23-30)
          console.log('Requesting Android 6-11 permissions...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          
          const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
          
          if (!hasPermission) {
            Alert.alert(
              'Permission Required',
              'Location permission is required for Bluetooth device discovery.',
              [{ text: 'OK' }]
            );
          }
          
          setHasPermissions(hasPermission);
        } else {
          // Android 5 and below - no runtime permissions needed
          setHasPermissions(true);
        }
      } catch (err) {
        console.error('Permission error:', err);
        setHasPermissions(false);
      }
    } else {
      // iOS - permissions handled automatically
      setHasPermissions(true);
    }
  };

  const toggleBluetooth = async () => {
    if (Platform.OS === 'android') {
      try {
        // Open Bluetooth settings directly using IntentLauncher
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS
        );
      } catch (error) {
        console.error('Error opening Bluetooth settings:', error);
        Alert.alert(
          'Error',
          'Could not open Bluetooth settings. Please enable Bluetooth manually in Settings.',
          [{ text: 'OK' }]
        );
      }
    } else {
      // iOS - cannot programmatically open Bluetooth settings
      Alert.alert(
        'Enable Bluetooth',
        'Please enable Bluetooth in Control Center or Settings > Bluetooth',
        [{ text: 'OK' }]
      );
    }
  };

  const startScanning = async () => {
    if (isScanning) return;
    
    // Check permissions first
    if (!hasPermissions) {
      Alert.alert(
        'Permissions Required',
        'Please grant Bluetooth and Location permissions to scan for devices.',
        [
          { text: 'Grant Permissions', onPress: checkBluetoothPermissions },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }
    
    setIsScanning(true);
    setDevices([]);

    console.log('Starting Classic Bluetooth discovery for nearby devices...');

    try {
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      console.log('Bluetooth enabled:', isEnabled);
      
      if (!isEnabled) {
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to scan for devices.');
        setIsScanning(false);
        return;
      }

      // Start discovery for nearby Classic Bluetooth devices
      console.log('Starting device discovery...');
      const discoveredDevices = await RNBluetoothClassic.startDiscovery();
      
      console.log('Discovery started! Initial devices found:', discoveredDevices ? discoveredDevices.length : 0);
      
      // If startDiscovery returns initial devices, add them to the list
      if (discoveredDevices && Array.isArray(discoveredDevices) && discoveredDevices.length > 0) {
        const initialDevices = discoveredDevices.map(device => {
          const rssiValue = device.extra && typeof device.extra === 'object' && 'rssi' in device.extra 
            ? Number((device.extra as any).rssi) 
            : null;
          
          return {
            id: device.address,
            name: device.name || device.address,
            rssi: rssiValue,
          };
        });
        
        setDevices(sortDevices(initialDevices));
        
        // Log each device
        discoveredDevices.forEach(device => {
          const rssiValue = device.extra && typeof device.extra === 'object' && 'rssi' in device.extra 
            ? (device.extra as any).rssi 
            : 'N/A';
          console.log('🔵 Initial device:', device.name || device.address, device.address, 'RSSI:', rssiValue);
        });
      }
      
      // Continue listening for new devices discovered during the scan
      const subscription = RNBluetoothClassic.onDeviceDiscovered((event) => {
        const device = event.device;
        const rssiValue = device.extra && typeof device.extra === 'object' && 'rssi' in device.extra 
          ? (device.extra as any).rssi 
          : 'N/A';
        console.log('🔵 Newly discovered device:', device.name, device.address, 'RSSI:', rssiValue);
        
        setDevices(prevDevices => {
          // Check if device already exists
          const existingIndex = prevDevices.findIndex(d => d.id === device.address);
          
          if (existingIndex >= 0) {
            // Update RSSI if changed
            const updated = [...prevDevices];
            const newRssi = device.extra && typeof device.extra === 'object' && 'rssi' in device.extra 
              ? Number((device.extra as any).rssi) 
              : null;
            updated[existingIndex] = {
              ...updated[existingIndex],
              rssi: newRssi,
            };
            return sortDevices(updated);
          } else {
            // Add new device
            const newRssi = device.extra && typeof device.extra === 'object' && 'rssi' in device.extra 
              ? Number((device.extra as any).rssi) 
              : null;
            const newDevices = [...prevDevices, {
              id: device.address,
              name: device.name || device.address,
              rssi: newRssi,
            }];
            return sortDevices(newDevices);
          }
        });
      });

      // Auto-stop discovery after 12 seconds
      setTimeout(async () => {
        await stopScanning();
      }, 12000);
      
    } catch (error) {
      console.error('Bluetooth scan error:', error);
      Alert.alert('Error', 'Failed to scan for Bluetooth devices: ' + error);
      setIsScanning(false);
    }
  };

  const isTargetDevice = (name: string | null): boolean => {
    if (!name) return false;
    const upperName = name.toUpperCase();
    return upperName.includes('ESP') || 
           upperName.includes('LORA') || 
           upperName.includes('RECEIVER');
  };

  const sortDevices = (devices: ScannedDevice[]) => {
    // Sort: Target devices (ESP/LoRa/Receiver) first, then by signal strength
    return devices.sort((a, b) => {
      const aIsTarget = isTargetDevice(a.name);
      const bIsTarget = isTargetDevice(b.name);
      
      if (aIsTarget && !bIsTarget) return -1;
      if (!aIsTarget && bIsTarget) return 1;
      
      // Then by RSSI (signal strength) - higher is better
      const aRssi = a.rssi || -999;
      const bRssi = b.rssi || -999;
      return bRssi - aRssi;
    });
  };

  const stopScanning = async () => {
    console.log('Stopping device scan...');
    
    try {
      await RNBluetoothClassic.cancelDiscovery();
      console.log('Stopped Classic Bluetooth discovery');
    } catch (error) {
      console.error('Error stopping discovery:', error);
    }
    
    setIsScanning(false);
  };

  const connectToDevice = async (deviceId: string) => {
    try {
      // Stop scanning before connecting
      await stopScanning();
      
      console.log('🔵 Connecting to Classic Bluetooth device:', deviceId);
      const device = await RNBluetoothClassic.connectToDevice(deviceId);
      
      // Use context's connectToDevice - this will persist across tab changes
      await connectDeviceInContext(device);
      
      setSerialData('');
      setIsSerialExpanded(true);
      
      // Start local UI updates for serial display
      startLocalSerialDisplay(device);
      
      Alert.alert('Success', `Connected to ${device.name || 'device'}. Data streaming will continue in background.`);
    } catch (error) {
      console.error('❌ Connection error:', error);
      Alert.alert('Error', 'Failed to connect to device: ' + error);
    }
  };

  // This is just for local serial display, actual data reading happens in context
  const startLocalSerialDisplay = (device: BluetoothDevice) => {
    setIsReading(true);
    console.log('📺 Starting local serial display...');
    
    // Subscribe to show data in serial monitor (optional, just for UI)
    device.onDataReceived((data) => {
      setSerialData(prev => {
        const newData = prev + data.data + '\n';
        // Keep only last 500 characters
        return newData.slice(-500);
      });
    });
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        // Save any remaining batch data before disconnecting
        if (sensorBatch.length > 0) {
          console.log(`💾 Saving remaining ${sensorBatch.length} readings before disconnect...`);
          await saveBatchToSupabase(sensorBatch);
          setSensorBatch([]);
        }
        
        // Use context's disconnect - cleans up everything
        await disconnectDeviceInContext();
        
        setSerialData('');
        setIsReading(false);
        setPreviousSensorData(null);
        Alert.alert('Disconnected', 'Device disconnected successfully');
      } catch (error) {
        console.error('❌ Disconnect error:', error);
      }
    }
  };

  const clearSerialData = () => {
    setSerialData('');
  };

  // Check if sensor data has changed (ignoring null values)
  const hasDataChanged = (newData: SensorData, oldData: SensorData | null): boolean => {
    if (!oldData) return true;
    
    // Check only non-null values for changes
    const keysToCheck: (keyof SensorData)[] = [
      'latitude', 'longitude', 'nitrogen', 'phosphorus', 
      'potassium', 'pH', 'moisture'
    ];
    
    for (const key of keysToCheck) {
      if (newData[key] !== null && newData[key] !== oldData[key]) {
        return true;
      }
    }
    return false;
  };

  // Save batch to Supabase
  const saveBatchToSupabase = async (batch: SensorReading[]) => {
    try {
      console.log(`Saving batch of ${batch.length} readings to Supabase...`);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No user logged in, skipping batch save');
        return;
      }

      // Prepare data for insertion
      const insertData = batch.map(reading => ({
        latitude: reading.latitude,
        longitude: reading.longitude,
        satellite_count: reading.satelliteCount,
        bearing: reading.bearing,
        nitrogen: reading.nitrogen,
        phosphorus: reading.phosphorus,
        potassium: reading.potassium,
        ph: reading.pH,
        moisture: reading.moisture,
        temperature: reading.temperature,
        humidity: reading.humidity,
        soil_conductivity: reading.soilConductivity,
        device_id: reading.deviceId,
        device_name: reading.deviceName,
        user_id: user.id,
        created_at: reading.timestamp.toISOString(),
      }));

      const { data, error } = await supabase
        .from('sensor_readings')
        .insert(insertData);

      if (error) {
        console.error('Error saving batch to Supabase:', error);
        Alert.alert('Error', 'Failed to save sensor data: ' + error.message);
      } else {
        console.log(`✅ Successfully saved ${batch.length} readings to Supabase`);
      }
    } catch (error) {
      console.error('Exception saving batch:', error);
    }
  };

  // Add reading to batch and save when batch reaches 10
  const addToBatch = (newData: SensorData) => {
    if (!connectedDevice) return;
    
    // Check if data has actually changed
    if (!hasDataChanged(newData, previousSensorData)) {
      return;
    }

    console.log('Data changed, adding to batch...');
    
    const reading: SensorReading = {
      ...newData,
      timestamp: new Date(),
      deviceId: connectedDevice.address,
      deviceName: connectedDevice.name || 'ESP32_SoilData',
    };

    setSensorBatch(prevBatch => {
      const newBatch = [...prevBatch, reading];
      
      // If batch reaches 10, save to Supabase
      if (newBatch.length >= 10) {
        console.log('Batch full (10 readings), saving to Supabase...');
        saveBatchToSupabase(newBatch);
        return []; // Clear batch after saving
      }
      
      console.log(`Batch size: ${newBatch.length}/10`);
      return newBatch;
    });

    setPreviousSensorData(newData);
  };

  const renderDevice = ({ item }: { item: ScannedDevice }) => {
    const isTarget = isTargetDevice(item.name);
    
    return (
      <TouchableOpacity 
        style={[styles.deviceCard, isTarget && styles.deviceCardESP]}
        onPress={() => connectToDevice(item.id)}
      >
        <View style={styles.deviceIcon}>
          <Ionicons 
            name="bluetooth" 
            size={28} 
            color={isTarget ? "#0bda95" : "#fb444a"} 
          />
        </View>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceNameRow}>
            <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
            {isTarget && (
              <View style={styles.espBadge}>
                <Ionicons name="flash" size={12} color="#0bda95" />
                <Text style={styles.espBadgeText}>SENSOR</Text>
              </View>
            )}
          </View>
          <Text style={styles.deviceId}>ID: {item.id.slice(0, 17)}...</Text>
          {item.rssi && (
            <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9e9c93" />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      {/* Connected Device */}
      {connectedDevice && (
        <View style={styles.connectedSection}>
          <Text style={styles.sectionTitle}>Connected Device</Text>
          <View style={styles.connectedCard}>
            <View style={styles.connectedInfo}>
              <Ionicons name="checkmark-circle" size={24} color="#0bda95" />
              <Text style={styles.connectedName}>{connectedDevice.name || 'Unknown Device'}</Text>
            </View>
            
            {/* Data Validity Indicator */}
            <View style={[styles.validityIndicator, isDataValid ? styles.validityIndicatorValid : styles.validityIndicatorInvalid]}>
              <Ionicons 
                name={isDataValid ? "checkmark-circle" : "alert-circle"} 
                size={14} 
                color={isDataValid ? "#0bda95" : "#ffa500"} 
              />
              <Text style={styles.validityText}>
                {isDataValid ? 'Valid GPS Data' : 'Waiting for GPS Lock'}
              </Text>
            </View>
            
            {/* Batch Status Indicator */}
            <View style={styles.batchStatusContainer}>
              <View style={styles.batchStatus}>
                <Ionicons name="cloud-upload-outline" size={16} color="#9e9c93" />
                <Text style={styles.batchStatusText}>
                  Batch: {sensorBatch.length}/10 readings
                </Text>
              </View>
              {sensorBatch.length > 0 && (
                <View style={styles.batchProgress}>
                  <View style={[styles.batchProgressFill, { width: `${(sensorBatch.length / 10) * 100}%` }]} />
                </View>
              )}
            </View>
            
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnectDevice}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Scan Controls - Only show when NOT connected */}
      {!connectedDevice && (
        <View style={styles.scanSection}>
          <Text style={styles.sectionTitle}>Scan for Sensor Devices</Text>
          
          {/* Bluetooth State Indicator with Toggle */}
          <View style={styles.stateIndicator}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={[
                styles.stateIcon,
                bluetoothState === 'PoweredOn' ? styles.stateIconOn : styles.stateIconOff
              ]}>
                <Ionicons 
                  name={bluetoothState === 'PoweredOn' ? 'bluetooth' : 'bluetooth-outline'} 
                  size={16} 
                  color={bluetoothState === 'PoweredOn' ? '#0bda95' : '#fb444a'} 
                />
              </View>
              <Text style={styles.stateText}>
                Bluetooth: {bluetoothState === 'PoweredOn' ? 'On' : bluetoothState === 'PoweredOff' ? 'Off' : bluetoothState}
              </Text>
            </View>
            {bluetoothState === 'PoweredOff' && (
              <TouchableOpacity 
                style={styles.toggleBluetoothButton} 
                onPress={toggleBluetooth}
              >
                <Ionicons name="settings-outline" size={16} color="#fb444a" />
                <Text style={styles.toggleBluetoothText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* ESP Devices Section */}
          <View style={styles.pairedDevicesHeader}>
            <View style={styles.scanningIndicator}>
              {isScanning && <ActivityIndicator size="small" color="#0bda95" />}
              <Text style={styles.sectionTitle}>Bluetooth Devices</Text>
            </View>
          </View>

          <View style={styles.scanButtonGroup}>
            <TouchableOpacity 
              style={[
                styles.refreshButton,
                isScanning && styles.refreshButtonActive
              ]}
              onPress={isScanning ? stopScanning : startScanning}
              disabled={bluetoothState !== 'PoweredOn' || !hasPermissions}
            >
              <Ionicons 
                name={isScanning ? "stop-circle" : "play-circle"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.refreshButtonText}>
                {isScanning ? 'Stop' : 'Scan'}
              </Text>
            </TouchableOpacity>
            
            {devices.length > 0 && devices.some(d => !isTargetDevice(d.name)) && (
              <TouchableOpacity 
                style={styles.toggleFilterButton}
                onPress={() => setShowAllDevices(!showAllDevices)}
              >
                <Ionicons 
                  name={showAllDevices ? "eye-off" : "eye"} 
                  size={16} 
                  color="#e0daca" 
                />
                <Text style={styles.toggleFilterText}>
                  {showAllDevices ? 'Hide' : 'Show All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {!hasPermissions && (
            <Text style={styles.permissionWarning}>
              ⚠️ Bluetooth permissions not granted
            </Text>
          )}
          
          {devices.length > 0 && (
            <View style={styles.deviceListCount}>
              <Text style={styles.deviceCountText}>
                {showAllDevices ? `All Devices (${devices.length})` : `Sensor Devices (${devices.filter(d => isTargetDevice(d.name)).length})`}
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  );

  const renderEmptyComponent = () => {
    if (connectedDevice) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="radio-outline" size={64} color="#9e9c93" />
        <Text style={styles.emptyText}>
          {isScanning ? 'Searching for devices...' : 'No devices found'}
        </Text>
        <Text style={styles.emptySubtext}>
          {isScanning 
            ? 'Make sure your ESP device is powered on'
            : 'Tap "Scan" to search for nearby Bluetooth devices'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="radio" size={28} color="#e0daca" />
        <Text style={styles.headerTitle}>Devices</Text>
        <View style={{ width: 28 }} />
      </View>

      {!connectedDevice ? (
        <FlatList
          data={showAllDevices ? devices : devices.filter(d => isTargetDevice(d.name))}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderHeader()}

          {/* Live Sensor Data - Only show when connected */}
          <View style={styles.sensorDataSection}>
            {/* Sensor Cards Grid */}
            <View style={styles.sensorGrid}>
              {/* Latitude */}
              <View style={styles.sensorCard}>
                <Ionicons name="navigate" size={24} color="#fb444a" />
                <Text style={styles.sensorLabel}>Latitude</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.latitude !== null ? `${sensorData.latitude}°` : '--'}
                </Text>
              </View>

              {/* Longitude */}
              <View style={styles.sensorCard}>
                <Ionicons name="navigate-outline" size={24} color="#4a9eff" />
                <Text style={styles.sensorLabel}>Longitude</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.longitude !== null ? `${sensorData.longitude}°` : '--'}
                </Text>
              </View>

              {/* Satellite Count */}
              <View style={styles.sensorCard}>
                <Ionicons name="globe" size={24} color="#0bda95" />
                <Text style={styles.sensorLabel}>Satellites</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.satelliteCount !== null ? `${sensorData.satelliteCount}` : '--'}
                </Text>
              </View>

              {/* Bearing */}
              <View style={styles.sensorCard}>
                <Ionicons name="compass" size={24} color="#ffa500" />
                <Text style={styles.sensorLabel}>Bearing</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.bearing !== null ? `${sensorData.bearing}°` : '--'}
                </Text>
              </View>

              {/* Nitrogen */}
              <View style={styles.sensorCard}>
                <Ionicons name="leaf" size={24} color="#32cd32" />
                <Text style={styles.sensorLabel}>Nitrogen (N)</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.nitrogen !== null ? `${sensorData.nitrogen}` : '--'}
                </Text>
              </View>

              {/* Phosphorus */}
              <View style={styles.sensorCard}>
                <Ionicons name="leaf-outline" size={24} color="#ff69b4" />
                <Text style={styles.sensorLabel}>Phosphorus (P)</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.phosphorus !== null ? `${sensorData.phosphorus}` : '--'}
                </Text>
              </View>

              {/* Potassium */}
              <View style={styles.sensorCard}>
                <Ionicons name="fitness" size={24} color="#9370db" />
                <Text style={styles.sensorLabel}>Potassium (K)</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.potassium !== null ? `${sensorData.potassium}` : '--'}
                </Text>
              </View>

              {/* pH */}
              <View style={styles.sensorCard}>
                <Ionicons name="flask" size={24} color="#ff6347" />
                <Text style={styles.sensorLabel}>pH Level</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.pH !== null ? `${sensorData.pH}` : '--'}
                </Text>
              </View>

              {/* Moisture */}
              <View style={styles.sensorCard}>
                <Ionicons name="water" size={24} color="#4a9eff" />
                <Text style={styles.sensorLabel}>Moisture</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.moisture !== null ? `${sensorData.moisture}%` : '--'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  connectedSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0daca',
    marginBottom: 12,
  },
  connectedCard: {
    backgroundColor: '#46474a',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#0bda95',
  },
  connectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  connectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0daca',
  },
  validityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  validityIndicatorValid: {
    backgroundColor: 'rgba(11, 218, 149, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(11, 218, 149, 0.3)',
  },
  validityIndicatorInvalid: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  validityText: {
    fontSize: 12,
    color: '#e0daca',
    fontWeight: '500',
  },
  batchStatusContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#3a3d42',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#525560',
  },
  batchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  batchStatusText: {
    fontSize: 14,
    color: '#9e9c93',
  },
  batchProgress: {
    height: 4,
    backgroundColor: '#525560',
    borderRadius: 2,
    overflow: 'hidden',
  },
  batchProgressFill: {
    height: '100%',
    backgroundColor: '#0bda95',
    borderRadius: 2,
  },
  disconnectButton: {
    backgroundColor: '#fb444a',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scanSection: {
    marginBottom: 24,
  },
  pairedDevicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#0bda95',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshButtonActive: {
    backgroundColor: '#fb444a',
  },
  refreshButtonDisabled: {
    backgroundColor: '#46474a',
    opacity: 0.5,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  stateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#46474a',
    borderRadius: 6,
  },
  stateIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateIconOn: {
    backgroundColor: 'rgba(11, 218, 149, 0.2)',
  },
  stateIconOff: {
    backgroundColor: 'rgba(251, 68, 74, 0.2)',
  },
  stateText: {
    fontSize: 14,
    color: '#e0daca',
    fontWeight: '500',
  },
  permissionWarning: {
    fontSize: 12,
    color: '#fb444a',
    marginTop: 8,
    textAlign: 'center',
  },
  listSection: {
    flex: 1,
  },
  listContent: {
    gap: 12,
  },
  deviceCard: {
    backgroundColor: '#46474a',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceCardESP: {
    backgroundColor: '#3a4a3e',
    borderLeftWidth: 3,
    borderLeftColor: '#0bda95',
  },
  espBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 218, 149, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  espBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0bda95',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251, 68, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0daca',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#9e9c93',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  deviceRssi: {
    fontSize: 11,
    color: '#9e9c93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0daca',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9e9c93',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  serialSection: {
    marginTop: 16,
    flex: 1,
  },
  serialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#46474a',
    borderRadius: 8,
  },
  serialTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(251, 68, 74, 0.2)',
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fb444a',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fb444a',
    letterSpacing: 0.5,
  },
  serialControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    padding: 8,
    backgroundColor: 'rgba(251, 68, 74, 0.2)',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#9e9c93',
    fontWeight: '500',
  },
  terminalContainer: {
    backgroundColor: '#1a1a1c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#46474a',
    overflow: 'hidden',
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2a2a2c',
    borderBottomWidth: 1,
    borderBottomColor: '#46474a',
  },
  terminalButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  terminalButton: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  terminalTitle: {
    fontSize: 11,
    color: '#9e9c93',
    fontFamily: 'monospace',
  },
  serialOutput: {
    backgroundColor: '#1a1a1c',
    padding: 12,
    maxHeight: 300,
    minHeight: 150,
  },
  serialText: {
    fontSize: 12,
    color: '#0bda95',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  serialPlaceholder: {
    fontSize: 12,
    color: '#9e9c93',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },
  serialHint: {
    fontSize: 10,
    color: '#9e9c93',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 14,
  },
  terminalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2a2a2c',
    borderTopWidth: 1,
    borderTopColor: '#46474a',
  },
  terminalFooterText: {
    fontSize: 10,
    color: '#9e9c93',
    fontFamily: 'monospace',
  },
  terminalBaudRate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleBluetoothButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(251, 68, 74, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fb444a',
  },
  toggleBluetoothText: {
    fontSize: 12,
    color: '#fb444a',
    fontWeight: '600',
  },
  deviceListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#46474a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#525560',
  },
  toggleFilterText: {
    fontSize: 13,
    color: '#e0daca',
    fontWeight: '600',
  },
  deviceListCount: {
    marginBottom: 12,
  },
  deviceCountText: {
    fontSize: 14,
    color: '#9e9c93',
    fontWeight: '500',
  },
  deviceListActions: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fb444a',
    borderRadius: 6,
  },
  verifyButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#46474a',
    borderRadius: 6,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#9e9c93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#0bda95',
  },
  deviceCardVerified: {
    borderWidth: 2,
    borderColor: '#0bda95',
    backgroundColor: 'rgba(11, 218, 149, 0.05)',
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(11, 218, 149, 0.2)',
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0bda95',
  },
  unverifiedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  verifyingText: {
    fontSize: 11,
    color: '#fb444a',
    fontStyle: 'italic',
    marginTop: 2,
  },
  sensorDataSection: {
    flex: 1,
  },
  sensorDataHeader: {
    backgroundColor: '#46474a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sensorDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0daca',
  },
  deviceNameText: {
    fontSize: 14,
    color: '#9e9c93',
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sensorCard: {
    width: '48%',
    backgroundColor: '#46474a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  sensorLabel: {
    fontSize: 12,
    color: '#9e9c93',
    textAlign: 'center',
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0daca',
  },
});
