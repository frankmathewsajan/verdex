import * as SMS from 'expo-sms';

interface SensorData {
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  ph?: number;
  pH?: number;
  moisture?: number;
  temperature?: number;
}

interface Recommendation {
  type: string;
  description: string;
  amount?: string;
}

interface SMSOptions {
  phoneNumber: string;
  language: 'english' | 'hindi' | 'telugu';
  data: SensorData;
  recommendations?: Recommendation[];
}

/**
 * Calculate overall soil health percentage
 */
const calculateHealthPercentage = (data: SensorData): number => {
  const ph = data.pH || data.ph || 0;
  
  // Define optimal ranges
  const optimalRanges = {
    nitrogen: { optimal: 280, min: 0, max: 560 },
    phosphorus: { optimal: 55, min: 0, max: 110 },
    potassium: { optimal: 205, min: 0, max: 410 },
    ph: { optimal: 6.5, min: 4.5, max: 8.5 },
    moisture: { optimal: 50, min: 0, max: 100 },
    temperature: { optimal: 25, min: 0, max: 50 },
  };
  
  const getHealthPercentage = (value: number, optimal: number, min: number, max: number) => {
    if (value === optimal) return 100;
    if (value < optimal) {
      const range = optimal - min;
      const distance = optimal - value;
      return Math.max(0, Math.min(100, 100 - (distance / range) * 100));
    } else {
      const range = max - optimal;
      const distance = value - optimal;
      return Math.max(0, Math.min(100, 100 - (distance / range) * 100));
    }
  };
  
  const nHealth = getHealthPercentage(data.nitrogen || 0, optimalRanges.nitrogen.optimal, optimalRanges.nitrogen.min, optimalRanges.nitrogen.max);
  const pHealth = getHealthPercentage(data.phosphorus || 0, optimalRanges.phosphorus.optimal, optimalRanges.phosphorus.min, optimalRanges.phosphorus.max);
  const kHealth = getHealthPercentage(data.potassium || 0, optimalRanges.potassium.optimal, optimalRanges.potassium.min, optimalRanges.potassium.max);
  const phHealth = getHealthPercentage(ph, optimalRanges.ph.optimal, optimalRanges.ph.min, optimalRanges.ph.max);
  const moistureHealth = getHealthPercentage(data.moisture || 0, optimalRanges.moisture.optimal, optimalRanges.moisture.min, optimalRanges.moisture.max);
  const tempHealth = getHealthPercentage(data.temperature || 0, optimalRanges.temperature.optimal, optimalRanges.temperature.min, optimalRanges.temperature.max);
  
  const overallHealth = (nHealth + pHealth + kHealth + phHealth + moistureHealth + tempHealth) / 6;
  return Math.round(overallHealth);
};

/**
 * Generate SMS text in the specified language
 */
const generateSMSText = (
  language: 'english' | 'hindi' | 'telugu',
  data: SensorData,
  recommendations?: Recommendation[]
): string => {
  const ph = data.pH || data.ph || 0;
  const health = calculateHealthPercentage(data);
  
  if (language === 'english') {
    let text = `🌱 EarthSmell Soil Report\n`;
    text += `N:${data.nitrogen} P:${data.phosphorus} K:${data.potassium}\n`;
    text += `pH:${ph} | Moisture:${data.moisture}% | Temp:${data.temperature}°C\n`;
    text += `Health: ${health}%\n`;
    
    if (recommendations && recommendations.length > 0) {
      text += `\nRecommendations:\n`;
      recommendations.slice(0, 2).forEach((rec, index) => {
        text += `${index + 1}. ${rec.description.substring(0, 60)}${rec.description.length > 60 ? '...' : ''}\n`;
      });
    }
    
    text += `\nView full report in EarthSmell app`;
    return text;
  }
  
  if (language === 'hindi') {
    let text = `🌱 वर्डेक्स मिट्टी रिपोर्ट\n`;
    text += `N:${data.nitrogen} P:${data.phosphorus} K:${data.potassium}\n`;
    text += `pH:${ph} | नमी:${data.moisture}% | तापमान:${data.temperature}°C\n`;
    text += `स्वास्थ्य: ${health}%\n`;
    
    if (recommendations && recommendations.length > 0) {
      text += `\nसिफारिशें:\n`;
      recommendations.slice(0, 2).forEach((rec, index) => {
        text += `${index + 1}. ${rec.description.substring(0, 50)}${rec.description.length > 50 ? '...' : ''}\n`;
      });
    }
    
    text += `\nवर्डेक्स ऐप में पूरी रिपोर्ट देखें`;
    return text;
  }
  
  if (language === 'telugu') {
    let text = `🌱 వర్డెక్స్ నేల నివేదిక\n`;
    text += `N:${data.nitrogen} P:${data.phosphorus} K:${data.potassium}\n`;
    text += `pH:${ph} | తేమ:${data.moisture}% | ఉష్ణోగ్రత:${data.temperature}°C\n`;
    text += `ఆరోగ్యం: ${health}%\n`;
    
    if (recommendations && recommendations.length > 0) {
      text += `\nసిఫార్సులు:\n`;
      recommendations.slice(0, 2).forEach((rec, index) => {
        text += `${index + 1}. ${rec.description.substring(0, 50)}${rec.description.length > 50 ? '...' : ''}\n`;
      });
    }
    
    text += `\nవర్డెక్స్ యాప్‌లో పూర్తి నివేదిక చూడండి`;
    return text;
  }
  
  return '';
};

/**
 * Check if SMS is available on the device
 */
export const isSMSAvailable = async (): Promise<boolean> => {
  try {
    return await SMS.isAvailableAsync();
  } catch (error) {
    console.error('❌ Error checking SMS availability:', error);
    return false;
  }
};

/**
 * Send prescription via SMS
 */
export const sendPrescriptionSMS = async (options: SMSOptions): Promise<SMS.SMSResponse> => {
  const { phoneNumber, language, data, recommendations } = options;
  
  try {
    // Check if SMS is available
    const available = await isSMSAvailable();
    if (!available) {
      throw new Error('SMS is not available on this device');
    }
    
    // Generate SMS text
    const message = generateSMSText(language, data, recommendations);
    
    if (!message) {
      throw new Error('Failed to generate SMS message');
    }
    
    // Send SMS
    const result = await SMS.sendSMSAsync(
      phoneNumber ? [phoneNumber] : [], // If no number, open compose with empty recipient
      message
    );
    
    console.log('📱 SMS Result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    throw error;
  }
};

/**
 * Compose SMS without sending (opens SMS app)
 */
export const composePrescriptionSMS = async (options: Omit<SMSOptions, 'phoneNumber'>): Promise<SMS.SMSResponse> => {
  const { language, data, recommendations } = options;
  
  try {
    // Check if SMS is available
    const available = await isSMSAvailable();
    if (!available) {
      throw new Error('SMS is not available on this device');
    }
    
    // Generate SMS text
    const message = generateSMSText(language, data, recommendations);
    
    if (!message) {
      throw new Error('Failed to generate SMS message');
    }
    
    // Open SMS composer (user can add phone number manually)
    const result = await SMS.sendSMSAsync([], message);
    
    console.log('📱 SMS Composer opened');
    return result;
  } catch (error) {
    console.error('❌ Error composing SMS:', error);
    throw error;
  }
};
