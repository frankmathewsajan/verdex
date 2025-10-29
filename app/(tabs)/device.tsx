import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScannedDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

export default function DeviceScreen() {
  const [bleManager] = useState(() => new BleManager());
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [serialData, setSerialData] = useState<string>('');
  const [isReading, setIsReading] = useState(false);
  const [bluetoothState, setBluetoothState] = useState<string>('Unknown');
  const [isSerialExpanded, setIsSerialExpanded] = useState(true);

  useEffect(() => {
    checkBluetoothPermissions();
    checkBluetoothState();
    
    // Monitor Bluetooth state changes
    const subscription = bleManager.onStateChange((state) => {
      setBluetoothState(state);
    }, true);
    
    return () => {
      bleManager.stopDeviceScan();
      subscription.remove();
    };
  }, []);

  const checkBluetoothState = async () => {
    try {
      const state = await bleManager.state();
      setBluetoothState(state);
    } catch (error) {
      console.error('Error checking Bluetooth state:', error);
    }
  };

  const checkBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        
        if (apiLevel >= 31) {
          // Android 12+
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          
          const allGranted = Object.values(granted).every(
            status => status === PermissionsAndroid.RESULTS.GRANTED
          );
          setHasPermissions(allGranted);
        } else {
          // Android 11 and below
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          setHasPermissions(granted === PermissionsAndroid.RESULTS.GRANTED);
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
      Alert.alert(
        'Enable Bluetooth',
        'Please enable Bluetooth in your device settings to scan for devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: async () => {
              try {
                // Try to open Bluetooth settings directly
                await Linking.openSettings();
              } catch (error) {
                console.error('Error opening settings:', error);
                Alert.alert('Error', 'Could not open settings. Please enable Bluetooth manually.');
              }
            }
          }
        ]
      );
    } else {
      // iOS automatically prompts for Bluetooth when needed
      Alert.alert(
        'Enable Bluetooth',
        'Please enable Bluetooth in Control Center or Settings',
        [
          { text: 'OK' }
        ]
      );
    }
  };

  const startScan = async () => {
    if (!hasPermissions) {
      Alert.alert(
        'Permissions Required',
        'Please enable Bluetooth and Location permissions to scan for devices.',
        [{ text: 'OK', onPress: checkBluetoothPermissions }]
      );
      return;
    }

    // Check if Bluetooth is enabled
    const bluetoothState = await bleManager.state();
    if (bluetoothState !== 'PoweredOn') {
      Alert.alert(
        'Bluetooth is Off',
        'Please turn on Bluetooth in your device settings to scan for devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    setScanning(true);
    setDevices([]);
    
    const discoveredDevices = new Map<string, ScannedDevice>();

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        setScanning(false);
        
        // Show user-friendly error message
        if (error.message.includes('powered off') || error.message.includes('PoweredOff')) {
          Alert.alert(
            'Bluetooth is Off',
            'Please turn on Bluetooth in your device settings.',
            [{ text: 'OK' }]
          );
        } else if (error.message.includes('unauthorized') || error.message.includes('permission')) {
          Alert.alert(
            'Permission Denied',
            'Bluetooth permissions are required. Please enable them in settings.',
            [{ text: 'OK', onPress: checkBluetoothPermissions }]
          );
        } else {
          Alert.alert(
            'Scan Error',
            `Unable to scan: ${error.message}`,
            [{ text: 'OK' }]
          );
        }
        return;
      }

      if (device && device.id) {
        // Filter for ESP32 devices (look for common ESP32 names)
        const deviceName = device.name || 'Unknown Device';
        const isESP32 = deviceName.toLowerCase().includes('esp32') || 
                        deviceName.toLowerCase().includes('esp') ||
                        deviceName.toLowerCase().includes('soil') ||
                        deviceName.toLowerCase().includes('verdex');

        if (isESP32 || !device.name) {
          discoveredDevices.set(device.id, {
            id: device.id,
            name: device.name,
            rssi: device.rssi,
          });
          
          setDevices(Array.from(discoveredDevices.values()));
        }
      }
    });

    // Stop scanning after 10 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setScanning(false);
    }, 10000);
  };

  const stopScan = () => {
    bleManager.stopDeviceScan();
    setScanning(false);
  };

  const connectToDevice = async (deviceId: string) => {
    try {
      bleManager.stopDeviceScan();
      setScanning(false);
      
      const device = await bleManager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(device);
      setSerialData('');
      
      // Start reading serial data
      startReadingSerialData(device);
      
      Alert.alert('Success', `Connected to ${device.name || 'device'}`);
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to connect to device');
    }
  };

  const startReadingSerialData = async (device: Device) => {
    try {
      setIsReading(true);
      
      // Get all services and characteristics
      const services = await device.services();
      
      for (const service of services) {
        const characteristics = await service.characteristics();
        
        for (const characteristic of characteristics) {
          // Check if characteristic supports notifications or reading
          if (characteristic.isNotifiable) {
            // Subscribe to notifications for serial data
            characteristic.monitor((error, char) => {
              if (error) {
                console.error('Monitor error:', error);
                return;
              }
              
              if (char?.value) {
                try {
                  // Decode base64 value to string
                  const decodedValue = Buffer.from(char.value, 'base64').toString('utf-8');
                  setSerialData(prev => prev + decodedValue);
                } catch (decodeError) {
                  console.error('Decode error:', decodeError);
                }
              }
            });
          } else if (characteristic.isReadable) {
            // Try to read the characteristic
            try {
              const readChar = await characteristic.read();
              if (readChar.value) {
                const decodedValue = Buffer.from(readChar.value, 'base64').toString('utf-8');
                setSerialData(prev => prev + decodedValue + '\n');
              }
            } catch (readError) {
              // Silent fail for unreadable characteristics
            }
          }
        }
      }
      
      setIsReading(false);
    } catch (error) {
      console.error('Reading error:', error);
      setIsReading(false);
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
        setSerialData('');
        setIsReading(false);
        Alert.alert('Disconnected', 'Device disconnected successfully');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  };

  const clearSerialData = () => {
    setSerialData('');
  };

  const renderDevice = ({ item }: { item: ScannedDevice }) => (
    <TouchableOpacity 
      style={styles.deviceCard}
      onPress={() => connectToDevice(item.id)}
    >
      <View style={styles.deviceIcon}>
        <Ionicons name="bluetooth" size={28} color="#fb444a" />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceId}>ID: {item.id.slice(0, 17)}...</Text>
        {item.rssi && (
          <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9e9c93" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="radio" size={28} color="#e0daca" />
        <Text style={styles.headerTitle}>Devices</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {/* Connected Device */}
        {connectedDevice && (
          <View style={styles.connectedSection}>
            <Text style={styles.sectionTitle}>Connected Device</Text>
            <View style={styles.connectedCard}>
              <View style={styles.connectedInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#0bda95" />
                <Text style={styles.connectedName}>{connectedDevice.name || 'Unknown Device'}</Text>
              </View>
              <TouchableOpacity style={styles.disconnectButton} onPress={disconnectDevice}>
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>

            {/* Serial Monitor - Collapsible Terminal View */}
            <View style={styles.serialSection}>
              <TouchableOpacity 
                style={styles.serialHeader}
                onPress={() => setIsSerialExpanded(!isSerialExpanded)}
                activeOpacity={0.7}
              >
                <View style={styles.serialTitleRow}>
                  <Ionicons name="terminal" size={20} color="#0bda95" />
                  <Text style={styles.sectionTitle}>Serial Monitor</Text>
                  {isReading && (
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  )}
                </View>
                <View style={styles.serialControls}>
                  <TouchableOpacity onPress={(e) => {
                    e.stopPropagation();
                    clearSerialData();
                  }} style={styles.clearButton}>
                    <Ionicons name="trash-outline" size={16} color="#9e9c93" />
                  </TouchableOpacity>
                  <Ionicons 
                    name={isSerialExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#9e9c93" 
                  />
                </View>
              </TouchableOpacity>
              
              {isSerialExpanded && (
                <View style={styles.terminalContainer}>
                  <View style={styles.terminalHeader}>
                    <View style={styles.terminalButtons}>
                      <View style={[styles.terminalButton, { backgroundColor: '#fb444a' }]} />
                      <View style={[styles.terminalButton, { backgroundColor: '#ffa500' }]} />
                      <View style={[styles.terminalButton, { backgroundColor: '#0bda95' }]} />
                    </View>
                    <Text style={styles.terminalTitle}>
                      {connectedDevice?.name || 'ESP32'} - COM Monitor
                    </Text>
                  </View>
                  <ScrollView 
                    style={styles.serialOutput} 
                    nestedScrollEnabled
                    ref={(ref) => ref?.scrollToEnd({ animated: true })}
                  >
                    {serialData ? (
                      <Text style={styles.serialText}>{serialData}</Text>
                    ) : (
                      <Text style={styles.serialPlaceholder}>
                        {isReading ? '⏳ Waiting for data...' : '💤 No data received yet'}
                      </Text>
                    )}
                  </ScrollView>
                  <View style={styles.terminalFooter}>
                    <Text style={styles.terminalFooterText}>
                      {serialData.length} bytes received
                    </Text>
                    <View style={styles.terminalBaudRate}>
                      <Ionicons name="speedometer-outline" size={12} color="#9e9c93" />
                      <Text style={styles.terminalFooterText}>115200 baud</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Scan Controls */}
        <View style={styles.scanSection}>
          <Text style={styles.sectionTitle}>Scan for ESP32 Devices</Text>
          
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
          
          <TouchableOpacity 
            style={[
              styles.scanButton, 
              scanning && styles.scanButtonActive,
              bluetoothState !== 'PoweredOn' && !scanning && styles.scanButtonDisabled
            ]}
            onPress={scanning ? stopScan : startScan}
            disabled={(bluetoothState !== 'PoweredOn' || !hasPermissions) && !scanning}
          >
            {scanning ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.scanButtonText}>Stop Scanning</Text>
              </>
            ) : (
              <>
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.scanButtonText}>Start Scan</Text>
              </>
            )}
          </TouchableOpacity>
          
          {!hasPermissions && (
            <Text style={styles.permissionWarning}>
              ⚠️ Bluetooth permissions not granted
            </Text>
          )}
        </View>

        {/* Device List */}
        {devices.length > 0 ? (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Found Devices ({devices.length})</Text>
            <FlatList
              data={devices}
              renderItem={renderDevice}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : !scanning && (
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={64} color="#9e9c93" />
            <Text style={styles.emptyText}>No devices found</Text>
            <Text style={styles.emptySubtext}>
              Tap "Start Scan" to search for nearby ESP32 devices
            </Text>
          </View>
        )}
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
    padding: 16,
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
  scanButton: {
    backgroundColor: '#fb444a',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanButtonActive: {
    backgroundColor: '#9e9c93',
  },
  scanButtonDisabled: {
    backgroundColor: '#46474a',
    opacity: 0.5,
  },
  scanButtonText: {
    fontSize: 16,
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
});
