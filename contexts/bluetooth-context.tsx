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
    // Data is considered invalid if:
    // 1. Latitude is 0 or null
    // 2. Longitude is 0 or null
    // 3. Both lat and lon are exactly 0.0 (dummy GPS)
    
    const hasRealGPS = 
      data.latitude !== null && 
      data.longitude !== null && 
      !(data.latitude === 0 && data.longitude === 0);
    
    return hasRealGPS;
  };

  const updateSensorData = (data: SensorData) => {
    const isValid = validateSensorData(data);
    const validatedData = { ...data, isValid };
    
    setLatestSensorData(validatedData);
    setIsDataValid(isValid);
    
    if (!isValid) {
      console.log('⚠️ Data validation failed: GPS coordinates are zero/invalid');
    }
  };

  const startReadingData = (device: BluetoothDevice) => {
    console.log('🔵 Starting persistent Bluetooth data reading...');
    
    let dataBuffer = ''; // Buffer to accumulate incomplete lines
    
    // Subscribe to data events from Classic Bluetooth
    dataSubscriptionRef.current = device.onDataReceived((data) => {
      try {
        // Data comes as string from Classic Bluetooth
        // New Format (multi-line):
        // Lat: 0.000000
        // Lon: 0.000000
        // Set0.00Heading: 101.56(N): 0.00
        // (P): 0.00
        // (K): 0.00(M)0.00 % || Temp: 26.00 °C || C: 0.00 uS/cm || pH: 8.20
        
        const receivedData = data.data;
        console.log('📥 Received Bluetooth data:', receivedData);

        // Add to buffer
        dataBuffer += receivedData;
        
        // Process complete lines (ending with newline)
        const lines = dataBuffer.split('\n');
        
        // Keep the last incomplete line in buffer
        dataBuffer = lines.pop() || '';
        
        // Parse the complete lines
        let parsedData: Partial<SensorData> = {
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
        };
        
        let hasValidData = false;
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          // Parse Latitude: "Lat: 0.000000"
          if (trimmedLine.startsWith('Lat:')) {
            const match = trimmedLine.match(/Lat:\s*([\d.]+)/);
            if (match) {
              parsedData.latitude = parseFloat(match[1]);
              hasValidData = true;
            }
          }
          
          // Parse Longitude: "Lon: 0.000000"
          else if (trimmedLine.startsWith('Lon:')) {
            const match = trimmedLine.match(/Lon:\s*([\d.]+)/);
            if (match) {
              parsedData.longitude = parseFloat(match[1]);
              hasValidData = true;
            }
          }
          
          // Parse complex line with Heading, N, P, K, M, Temp, C, pH
          // Example: "Set0.00Heading: 101.56(N): 0.00" or "(P): 0.00" or "(K): 0.00(M)0.00 % || Temp: 26.00 °C || C: 0.00 uS/cm || pH: 8.20"
          else {
            // Extract Heading/Bearing
            const headingMatch = trimmedLine.match(/Heading:\s*([\d.]+)/);
            if (headingMatch) {
              parsedData.bearing = parseFloat(headingMatch[1]);
              hasValidData = true;
            }
            
            // Extract Nitrogen: "(N): 0.00"
            const nitrogenMatch = trimmedLine.match(/\(N\):\s*([\d.]+)/);
            if (nitrogenMatch) {
              parsedData.nitrogen = parseFloat(nitrogenMatch[1]);
              hasValidData = true;
            }
            
            // Extract Phosphorus: "(P): 0.00"
            const phosphorusMatch = trimmedLine.match(/\(P\):\s*([\d.]+)/);
            if (phosphorusMatch) {
              parsedData.phosphorus = parseFloat(phosphorusMatch[1]);
              hasValidData = true;
            }
            
            // Extract Potassium: "(K): 0.00"
            const potassiumMatch = trimmedLine.match(/\(K\):\s*([\d.]+)/);
            if (potassiumMatch) {
              parsedData.potassium = parseFloat(potassiumMatch[1]);
              hasValidData = true;
            }
            
            // Extract Moisture: "(M)0.00 %"
            const moistureMatch = trimmedLine.match(/\(M\)([\d.]+)\s*%/);
            if (moistureMatch) {
              parsedData.moisture = parseFloat(moistureMatch[1]);
              hasValidData = true;
            }
            
            // Extract Temperature: "Temp: 26.00 °C"
            const tempMatch = trimmedLine.match(/Temp:\s*([\d.]+)\s*°C/);
            if (tempMatch) {
              parsedData.temperature = parseFloat(tempMatch[1]);
              hasValidData = true;
            }
            
            // Extract Soil Conductivity: "C: 0.00 uS/cm"
            const conductivityMatch = trimmedLine.match(/C:\s*([\d.]+)\s*uS\/cm/);
            if (conductivityMatch) {
              parsedData.soilConductivity = parseFloat(conductivityMatch[1]);
              hasValidData = true;
            }
            
            // Extract pH: "pH: 8.20"
            const phMatch = trimmedLine.match(/pH:\s*([\d.]+)/);
            if (phMatch) {
              parsedData.pH = parseFloat(phMatch[1]);
              hasValidData = true;
            }
          }
        }
        
        // Only update if we have some valid data
        if (hasValidData) {
          // Update context with new data - accessible from all tabs
          updateSensorData(parsedData as SensorData);
        }
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
