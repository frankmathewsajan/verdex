import * as Speech from 'expo-speech';

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

interface SpeakOptions {
  language: 'english' | 'hindi' | 'telugu';
  data: SensorData;
  recommendations?: Recommendation[];
  rate?: number; // 0.5 to 2.0, default 1.0
}

// Language code mapping
const LANGUAGE_CODES = {
  english: 'en-IN',
  hindi: 'hi-IN',
  telugu: 'te-IN',
};

/**
 * Generate prescription text in the specified language
 */
const generatePrescriptionText = (
  language: 'english' | 'hindi' | 'telugu',
  data: SensorData,
  recommendations?: Recommendation[]
): string => {
  const ph = data.pH || data.ph || 0;
  
  if (language === 'english') {
    let text = `Hello farmer. Here is your soil analysis report. `;
    text += `Nitrogen level is ${data.nitrogen} kilograms per hectare. `;
    text += `Phosphorus level is ${data.phosphorus} kilograms per hectare. `;
    text += `Potassium level is ${data.potassium} kilograms per hectare. `;
    text += `Soil pH is ${ph}. `;
    text += `Moisture level is ${data.moisture} percent. `;
    text += `Temperature is ${data.temperature} degrees celsius. `;
    
    if (recommendations && recommendations.length > 0) {
      text += `Here are the recommendations. `;
      recommendations.forEach((rec, index) => {
        text += `Recommendation ${index + 1}. ${rec.description}. `;
        if (rec.amount) {
          text += `Amount needed: ${rec.amount}. `;
        }
      });
    }
    
    text += `Thank you for using Verdex.`;
    return text;
  }
  
  if (language === 'hindi') {
    let text = `नमस्ते किसान भाई। यह आपकी मिट्टी परीक्षण रिपोर्ट है। `;
    text += `नाइट्रोजन स्तर ${data.nitrogen} किलोग्राम प्रति हेक्टेयर है। `;
    text += `फास्फोरस स्तर ${data.phosphorus} किलोग्राम प्रति हेक्टेयर है। `;
    text += `पोटाश स्तर ${data.potassium} किलोग्राम प्रति हेक्टेयर है। `;
    text += `मिट्टी का पीएच ${ph} है। `;
    text += `नमी स्तर ${data.moisture} प्रतिशत है। `;
    text += `तापमान ${data.temperature} डिग्री सेल्सियस है। `;
    
    if (recommendations && recommendations.length > 0) {
      text += `यहां सिफारिशें हैं। `;
      recommendations.forEach((rec, index) => {
        text += `सिफारिश ${index + 1}. ${rec.description}। `;
        if (rec.amount) {
          text += `आवश्यक मात्रा: ${rec.amount}। `;
        }
      });
    }
    
    text += `वर्डेक्स का उपयोग करने के लिए धन्यवाद।`;
    return text;
  }
  
  if (language === 'telugu') {
    let text = `నమస్కారం రైతు గారు. ఇది మీ నేల విశ్లేషణ నివేదిక. `;
    text += `నత్రజని స్థాయి ${data.nitrogen} కిలోగ్రాములు ప్రతి హెక్టార్. `;
    text += `భాస్వరం స్థాయి ${data.phosphorus} కిలోగ్రాములు ప్రతి హెక్టార్. `;
    text += `పొటాషియం స్థాయి ${data.potassium} కిలోగ్రాములు ప్రతి హెక్టార్. `;
    text += `నేల పిహెచ్ ${ph} ఉంది. `;
    text += `తేమ స్థాయి ${data.moisture} శాతం. `;
    text += `ఉష్ణోగ్రత ${data.temperature} డిగ్రీల సెల్సియస్. `;
    
    if (recommendations && recommendations.length > 0) {
      text += `ఇక్కడ సిఫార్సులు ఉన్నాయి. `;
      recommendations.forEach((rec, index) => {
        text += `సిఫార్సు ${index + 1}. ${rec.description}. `;
        if (rec.amount) {
          text += `అవసరమైన మొత్తం: ${rec.amount}. `;
        }
      });
    }
    
    text += `వర్డెక్స్ ఉపయోగించినందుకు ధన్యవాదాలు.`;
    return text;
  }
  
  return '';
};

/**
 * Speak the prescription in the specified language
 */
export const speakPrescription = async (options: SpeakOptions): Promise<void> => {
  const { language, data, recommendations, rate = 0.9 } = options;
  
  try {
    // Stop any ongoing speech first
    await Speech.stop();
    
    // Generate text in the specified language
    const text = generatePrescriptionText(language, data, recommendations);
    
    if (!text) {
      throw new Error('Failed to generate prescription text');
    }
    
    // Get language code
    const languageCode = LANGUAGE_CODES[language];
    
    // Speak the text
    Speech.speak(text, {
      language: languageCode,
      pitch: 1.0,
      rate: rate,
      onDone: () => {
        console.log('✅ Speech completed');
      },
      onError: (error) => {
        console.error('❌ Speech error:', error);
      },
    });
  } catch (error) {
    console.error('❌ Error speaking prescription:', error);
    throw error;
  }
};

/**
 * Stop any ongoing speech
 */
export const stopSpeaking = async (): Promise<void> => {
  try {
    await Speech.stop();
    console.log('🛑 Speech stopped');
  } catch (error) {
    console.error('❌ Error stopping speech:', error);
  }
};

/**
 * Check if speech is currently playing
 */
export const isSpeaking = async (): Promise<boolean> => {
  try {
    return await Speech.isSpeakingAsync();
  } catch (error) {
    console.error('❌ Error checking speech status:', error);
    return false;
  }
};

/**
 * Pause ongoing speech
 */
export const pauseSpeaking = async (): Promise<void> => {
  try {
    await Speech.pause();
    console.log('⏸️ Speech paused');
  } catch (error) {
    console.error('❌ Error pausing speech:', error);
  }
};

/**
 * Resume paused speech
 */
export const resumeSpeaking = async (): Promise<void> => {
  try {
    await Speech.resume();
    console.log('▶️ Speech resumed');
  } catch (error) {
    console.error('❌ Error resuming speech:', error);
  }
};

/**
 * Get available voices for a language
 */
export const getAvailableVoices = async (): Promise<Speech.Voice[]> => {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices;
  } catch (error) {
    console.error('❌ Error getting voices:', error);
    return [];
  }
};
