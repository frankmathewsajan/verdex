import { useBluetooth } from '@/contexts/bluetooth-context';
import { useTheme } from '@/contexts/theme-context';
import { createDeviceStyles } from '@/styles/device.styles';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, PermissionsAndroid, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Path, Svg } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const MAX_LIVE_DATA_POINTS = 300;

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

interface LiveDataPoint {
  timestamp: number;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  pH: number | null;
}

export default function DeviceScreen() {
  const { colors } = useTheme();
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
  const [batchCompleted, setBatchCompleted] = useState(false); // Track if batch was sent
  const scrollViewRef = useRef<ScrollView>(null);
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([]);

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
      
      // Add to live chart data
      const newPoint: LiveDataPoint = {
        timestamp: Date.now(),
        nitrogen: latestSensorData.nitrogen,
        phosphorus: latestSensorData.phosphorus,
        potassium: latestSensorData.potassium,
        pH: latestSensorData.pH,
      };

      setLiveData(prevData => {
        // Check if data has changed from last point
        const lastPoint = prevData[prevData.length - 1];
        if (lastPoint && 
            lastPoint.nitrogen === newPoint.nitrogen &&
            lastPoint.phosphorus === newPoint.phosphorus &&
            lastPoint.potassium === newPoint.potassium &&
            lastPoint.pH === newPoint.pH) {
          return prevData; // No change, don't add duplicate
        }

        // Add new point and keep only last MAX_LIVE_DATA_POINTS
        const updated = [...prevData, newPoint];
        if (updated.length > MAX_LIVE_DATA_POINTS) {
          return updated.slice(updated.length - MAX_LIVE_DATA_POINTS);
        }
        return updated;
      });
      
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
        
        // Check if this is a target device - if so, we can stop scanning sooner
        const isTarget = isTargetDevice(device.name);
        if (isTarget) {
          console.log('🎯 Target device found! Stopping scan early.');
        }
        
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
        
        // Stop early if we found a target device
        if (isTarget) {
          setTimeout(async () => {
            await stopScanning();
          }, 1000); // Give 1 more second to find other nearby target devices
        }
      });

      // Auto-stop discovery after 5 seconds (reduced from 12)
      setTimeout(async () => {
        await stopScanning();
      }, 5000);
      
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
      setBatchCompleted(false); // Reset batch completion flag on new connection
      
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

  // Chart generation functions
  const generateLiveChartPath = (data: (number | null)[], width: number, height: number) => {
    if (!data || data.length === 0) return { path: '', values: [], points: [], min: 0, max: 0 };
    
    const validData = data.filter(v => v !== null) as number[];
    if (validData.length === 0) return { path: '', values: [], points: [], min: 0, max: 0 };
    
    const smoothedData = smoothData(validData, 3); // 3-point moving average
    
    const min = Math.min(...smoothedData);
    const max = Math.max(...smoothedData);
    const range = max - min || 1;
    const xStep = width / (smoothedData.length - 1 || 1);
    
    const points = smoothedData.map((value, index) => {
      const x = index * xStep;
      const y = height - ((value - min) / range) * height;
      return { x, y, value };
    });
    
    const path = points.length > 0 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
    
    return { path, values: smoothedData, points, min, max };
  };

  // Smoothing function to reduce fluctuations
  const smoothData = (data: number[], windowSize: number = 3): number[] => {
    if (data.length < windowSize) return data;
    
    const smoothed: number[] = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(data.length, i + halfWindow + 1);
      const window = data.slice(start, end);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      smoothed.push(avg);
    }
    
    return smoothed;
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
        moisture: reading.moisture !== null ? Math.round(reading.moisture) : null, // Round to integer
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

  // Add reading to batch and save when batch reaches 30
  const addToBatch = (newData: SensorData) => {
    if (!connectedDevice) return;
    
    // If batch was already completed, don't add more data
    if (batchCompleted) {
      console.log('⏸️ Batch already completed. Stop collecting until manually restarted.');
      return;
    }
    
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
      
      // If batch reaches 30, save to Supabase
      if (newBatch.length >= 30) {
        console.log('Batch full (30 readings), saving to Supabase...');
        saveBatchToSupabase(newBatch);
        setBatchCompleted(true); // Mark batch as completed
        return []; // Clear batch after saving
      }
      
      console.log(`Batch size: ${newBatch.length}/30`);
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
        <Ionicons name="chevron-forward" size={20} color="colors.textSecondary" />
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
                <Ionicons name="cloud-upload-outline" size={16} color="colors.textSecondary" />
                <Text style={styles.batchStatusText}>
                  Batch: {batchCompleted ? 'Completed ✓' : `${sensorBatch.length}/30 readings`}
                </Text>
              </View>
              {!batchCompleted && sensorBatch.length > 0 && (
                <View style={styles.batchProgress}>
                  <View style={[styles.batchProgressFill, { width: `${(sensorBatch.length / 30) * 100}%` }]} />
                </View>
              )}
              {batchCompleted && (
                <TouchableOpacity 
                  style={styles.restartBatchButton} 
                  onPress={() => {
                    setBatchCompleted(false);
                    setSensorBatch([]);
                    console.log('🔄 Batch collection restarted manually');
                  }}
                >
                  <Ionicons name="refresh" size={14} color="#0bda95" />
                  <Text style={styles.restartBatchText}>Restart</Text>
                </TouchableOpacity>
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
                  color="colors.text" 
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
        <Ionicons name="radio-outline" size={64} color="colors.textSecondary" />
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

  const styles = createDeviceStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="radio" size={28} color={colors.text} />
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

          {/* NPK pH Values Card */}
          <View style={styles.npkSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>NPK & pH Analysis</Text>
              {isConnected && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <View style={styles.npkGrid}>
              <View style={styles.npkCard}>
                <Text style={styles.npkLabel}>Nitrogen (N)</Text>
                <Text style={[styles.npkValue, { color: '#32cd32' }]}>
                  {sensorData.nitrogen !== null ? `${sensorData.nitrogen} ppm` : '--'}
                </Text>
              </View>
              <View style={styles.npkCard}>
                <Text style={styles.npkLabel}>Phosphorus (P)</Text>
                <Text style={[styles.npkValue, { color: '#ff69b4' }]}>
                  {sensorData.phosphorus !== null ? `${sensorData.phosphorus} ppm` : '--'}
                </Text>
              </View>
              <View style={styles.npkCard}>
                <Text style={styles.npkLabel}>Potassium (K)</Text>
                <Text style={[styles.npkValue, { color: '#9370db' }]}>
                  {sensorData.potassium !== null ? `${sensorData.potassium} ppm` : '--'}
                </Text>
              </View>
              <View style={styles.npkCard}>
                <Text style={styles.npkLabel}>pH Level</Text>
                <Text style={[styles.npkValue, { color: '#ff6347' }]}>
                  {sensorData.pH !== null ? sensorData.pH.toFixed(1) : '--'}
                </Text>
              </View>
            </View>
          </View>

          {/* Live Trend Graph - Only show when connected and has data */}
          {isConnected && liveData.length > 1 && (
            <View style={styles.trendSection}>
              <View style={styles.trendHeader}>
                <Ionicons name="analytics" size={24} color={colors.primary} />
                <Text style={styles.trendTitle}>Real-Time Trends</Text>
                <Text style={styles.dataCount}>
                  {liveData.length}/{MAX_LIVE_DATA_POINTS} readings
                </Text>
              </View>

              {/* Main Chart */}
              <View style={styles.chartContainer}>
                {/* Y-axis labels */}
                <View style={styles.yAxisLabels}>
                  <Text style={styles.axisLabel}>Max</Text>
                  <Text style={styles.axisLabel}>Mid</Text>
                  <Text style={styles.axisLabel}>Min</Text>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Svg height={160} width={CHART_WIDTH} viewBox={`0 0 ${CHART_WIDTH} 160`}>
                    {/* Grid lines */}
                    <Path d={`M 0 40 L ${CHART_WIDTH} 40`} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
                    <Path d={`M 0 80 L ${CHART_WIDTH} 80`} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
                    <Path d={`M 0 120 L ${CHART_WIDTH} 120`} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
                    
                    {/* Nitrogen Line */}
                    {(() => {
                      const chartData = generateLiveChartPath(liveData.map(d => d.nitrogen), CHART_WIDTH, 160);
                      return (
                        <>
                          <Path
                            d={chartData.path}
                            stroke="#32cd32"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          {chartData.points.map((point, i) => (
                            <Circle key={`n-${i}`} cx={point.x} cy={point.y} r="3" fill="#32cd32" />
                          ))}
                        </>
                      );
                    })()}
                    
                    {/* Phosphorus Line */}
                    {(() => {
                      const chartData = generateLiveChartPath(liveData.map(d => d.phosphorus), CHART_WIDTH, 160);
                      return (
                        <>
                          <Path
                            d={chartData.path}
                            stroke="#ff69b4"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          {chartData.points.map((point, i) => (
                            <Circle key={`p-${i}`} cx={point.x} cy={point.y} r="3" fill="#ff69b4" />
                          ))}
                        </>
                      );
                    })()}
                    
                    {/* Potassium Line */}
                    {(() => {
                      const chartData = generateLiveChartPath(liveData.map(d => d.potassium), CHART_WIDTH, 160);
                      return (
                        <>
                          <Path
                            d={chartData.path}
                            stroke="#9370db"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          {chartData.points.map((point, i) => (
                            <Circle key={`k-${i}`} cx={point.x} cy={point.y} r="3" fill="#9370db" />
                          ))}
                        </>
                      );
                    })()}
                    
                    {/* pH Line (scaled) */}
                    {(() => {
                      const chartData = generateLiveChartPath(liveData.map(d => d.pH ? d.pH * 10 : null), CHART_WIDTH, 160);
                      return (
                        <>
                          <Path
                            d={chartData.path}
                            stroke="#ff6347"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          {chartData.points.map((point, i) => (
                            <Circle key={`ph-${i}`} cx={point.x} cy={point.y} r="3" fill="#ff6347" />
                          ))}
                        </>
                      );
                    })()}
                  </Svg>
                  
                  {/* X-axis label */}
                  <Text style={styles.xAxisLabel}>Time (most recent →)</Text>
                </View>
              </View>

              {/* Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#32cd32' }]} />
                  <Text style={styles.legendText}>N</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ff69b4' }]} />
                  <Text style={styles.legendText}>P</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#9370db' }]} />
                  <Text style={styles.legendText}>K</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ff6347' }]} />
                  <Text style={styles.legendText}>pH (×10)</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
