import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { BluetoothDevice } from 'react-native-bluetooth-classic';

export interface SensorData {
  latitude: number | null;
  longitude: number | null;
  satelliteCount: number | null;
  bearing: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  pH: number | null;
  moisture: number | null;
  temperature: number | null;
  humidity: number | null;
  soilConductivity: number | null;
  isValid?: boolean; // Indicates if data is real (not dummy/zero GPS)
}

interface BluetoothContextType {
  latestSensorData: SensorData | null;
  updateSensorData: (data: SensorData) => void;
  isConnected: boolean;
  connectedDevice: BluetoothDevice | null;
  connectToDevice: (device: BluetoothDevice) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  isDataValid: boolean; // New: indicates if current data is valid for batching
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider = ({ children }: { children: ReactNode }) => {
  const [latestSensorData, setLatestSensorData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isDataValid, setIsDataValid] = useState(false);
  const dataSubscriptionRef = useRef<any>(null);

  const validateSensorData = (data: SensorData): boolean => {
    // Check if GPS data is real (not zero/dummy)
    console.log('🔍 Validating GPS data:', {
      lat: data.latitude,
      lon: data.longitude,
      sat: data.satelliteCount,
    });
    
    // Data is considered VALID if:
    // 1. Latitude is not null AND not exactly 0
    // 2. Longitude is not null AND not exactly 0
    // 3. At least one coordinate is non-zero (more lenient)
    // 4. Satellite count > 0 indicates GPS lock
    
    const hasValidLat = data.latitude !== null && Math.abs(data.latitude) > 0.0001;
    const hasValidLon = data.longitude !== null && Math.abs(data.longitude) > 0.0001;
    const hasSatellites = data.satelliteCount !== null && data.satelliteCount > 0;
    
    // Valid if BOTH coordinates are non-zero OR we have satellites
    const isValid = (hasValidLat && hasValidLon) || hasSatellites;
    
    console.log('🔍 Validation result:', {
      validLat: hasValidLat,
      validLon: hasValidLon,
      satellites: hasSatellites,
      finalResult: isValid ? '✅ VALID' : '❌ INVALID (Waiting for GPS lock...)',
    });
    
    return isValid;
  };

  const updateSensorData = (data: SensorData) => {
    console.log('📊 Updating sensor data...');
    const isValid = validateSensorData(data);
    const validatedData = { ...data, isValid };
    
    console.log('💾 Setting latest sensor data with isValid:', isValid);
    setLatestSensorData(validatedData);
    setIsDataValid(isValid);
    
    if (!isValid) {
      console.log('⚠️ Data validation failed: GPS coordinates are zero/invalid');
    } else {
      console.log('✅ Data validated: GPS coordinates are valid, batching enabled');
    }
  };

  const startReadingData = (device: BluetoothDevice) => {
    console.log('🔵 Starting persistent Bluetooth data reading...');
    
    // Subscribe to data events from Classic Bluetooth
    dataSubscriptionRef.current = device.onDataReceived((data) => {
      try {
        // Data comes as a single line string from Classic Bluetooth
        // Format: "Lat: 16.495142  Lon: 80.499062  Set: 6.00  Heading: 92.29  (N): 11.00  (P): 14.00  (K): 36.00  (M): 53.70  Temp: 25.50  C: 185.00  pH: 8.60"
        
        const receivedData = data.data.trim();
        console.log('📥 Received Bluetooth data:', receivedData);

        // Parse all values from the single line
        const latMatch = receivedData.match(/Lat:\s*([\d.]+)/);
        const lonMatch = receivedData.match(/Lon:\s*([\d.]+)/);
        const setMatch = receivedData.match(/Set:\s*([\d.]+)/);
        const headingMatch = receivedData.match(/Heading:\s*([\d.]+)/);
        const nitrogenMatch = receivedData.match(/\(N\):\s*([\d.]+)/);
        const phosphorusMatch = receivedData.match(/\(P\):\s*([\d.]+)/);
        const potassiumMatch = receivedData.match(/\(K\):\s*([\d.]+)/);
        const moistureMatch = receivedData.match(/\(M\):\s*([\d.]+)/);
        const tempMatch = receivedData.match(/Temp:\s*([\d.]+)/);
        const conductivityMatch = receivedData.match(/C:\s*([\d.]+)/);
        const phMatch = receivedData.match(/pH:\s*([\d.]+)/);

        // Build complete data object
        const completeData: SensorData = {
          latitude: latMatch ? parseFloat(latMatch[1]) : null,
          longitude: lonMatch ? parseFloat(lonMatch[1]) : null,
          satelliteCount: setMatch ? parseFloat(setMatch[1]) : null,
          bearing: headingMatch ? parseFloat(headingMatch[1]) : null,
          nitrogen: nitrogenMatch ? parseFloat(nitrogenMatch[1]) : null,
          phosphorus: phosphorusMatch ? parseFloat(phosphorusMatch[1]) : null,
          potassium: potassiumMatch ? parseFloat(potassiumMatch[1]) : null,
          pH: phMatch ? parseFloat(phMatch[1]) : null,
          moisture: moistureMatch ? parseFloat(moistureMatch[1]) : null,
          temperature: tempMatch ? parseFloat(tempMatch[1]) : null,
          humidity: null,
          soilConductivity: conductivityMatch ? parseFloat(conductivityMatch[1]) : null,
        };

        console.log('📦 Parsed complete data:', {
          lat: completeData.latitude,
          lon: completeData.longitude,
          N: completeData.nitrogen,
          P: completeData.phosphorus,
          K: completeData.potassium,
          pH: completeData.pH,
        });

        // Update context with complete data
        updateSensorData(completeData);
      } catch (error) {
        console.error('❌ Error processing Bluetooth data:', error);
      }
    });
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      console.log('🔵 Connecting to device in context:', device.address);
      setConnectedDevice(device);
      setIsConnected(true);
      
      // Start reading data - this will persist across tab changes
      startReadingData(device);
      
      console.log('✅ Device connected and reading started in context');
    } catch (error) {
      console.error('❌ Error connecting to device:', error);
      setConnectedDevice(null);
      setIsConnected(false);
      throw error;
    }
  };

  const disconnectDevice = async () => {
    try {
      console.log('🔴 Disconnecting device from context...');
      
      // Unsubscribe from data events
      if (dataSubscriptionRef.current) {
        dataSubscriptionRef.current = null;
      }
      
      if (connectedDevice) {
        await connectedDevice.disconnect();
      }
      
      setConnectedDevice(null);
      setIsConnected(false);
      setLatestSensorData(null);
      setIsDataValid(false);
      
      console.log('✅ Device disconnected from context');
    } catch (error) {
      console.error('❌ Error disconnecting device:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dataSubscriptionRef.current) {
        dataSubscriptionRef.current = null;
      }
    };
  }, []);

  return (
    <BluetoothContext.Provider
      value={{
        latestSensorData,
        updateSensorData,
        isConnected,
        connectedDevice,
        connectToDevice,
        disconnectDevice,
        isDataValid,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = () => {
  const context = useContext(BluetoothContext);
  if (context === undefined) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
};
