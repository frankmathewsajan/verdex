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
}

interface BluetoothContextType {
  latestSensorData: SensorData | null;
  updateSensorData: (data: SensorData) => void;
  isConnected: boolean;
  connectedDevice: BluetoothDevice | null;
  connectToDevice: (device: BluetoothDevice) => Promise<void>;
  disconnectDevice: () => Promise<void>;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider = ({ children }: { children: ReactNode }) => {
  const [latestSensorData, setLatestSensorData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const dataSubscriptionRef = useRef<any>(null);

  const updateSensorData = (data: SensorData) => {
    setLatestSensorData(data);
  };

  const startReadingData = (device: BluetoothDevice) => {
    console.log('🔵 Starting persistent Bluetooth data reading...');
    
    // Subscribe to data events from Classic Bluetooth
    dataSubscriptionRef.current = device.onDataReceived((data) => {
      try {
        // Data comes as string from Classic Bluetooth
        // Format: "latitude, longitude, satelliteCount, bearing, N: nitrogen, P: phosphorus, K: potassium, pH: pH, M: moisture"
        // Example: "18.4, 80.9, 6, 4, N: 23, P: 12, K: 25, pH: 7.5, M: 85"
        const receivedData = data.data;
        console.log('📥 Received Bluetooth data:', receivedData);

        // Parse the received data
        const parts = receivedData.split(',').map((part: string) => part.trim());
        
        if (parts.length >= 4) {
          const parsedData: SensorData = {
            latitude: parseFloat(parts[0]) || null,
            longitude: parseFloat(parts[1]) || null,
            satelliteCount: parseInt(parts[2]) || null,
            bearing: parseFloat(parts[3]) || null,
            nitrogen: null,
            phosphorus: null,
            potassium: null,
            pH: null,
            moisture: null,
          };

          // Parse nutrient data (N, P, K, pH, M)
          parts.slice(4).forEach((item: string) => {
            if (item.includes('N:')) parsedData.nitrogen = parseFloat(item.split(':')[1]) || null;
            else if (item.includes('P:')) parsedData.phosphorus = parseFloat(item.split(':')[1]) || null;
            else if (item.includes('K:')) parsedData.potassium = parseFloat(item.split(':')[1]) || null;
            else if (item.includes('pH:')) parsedData.pH = parseFloat(item.split(':')[1]) || null;
            else if (item.includes('M:')) parsedData.moisture = parseFloat(item.split(':')[1]) || null;
          });
          
          // Update context with new data - accessible from all tabs
          updateSensorData(parsedData);
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
