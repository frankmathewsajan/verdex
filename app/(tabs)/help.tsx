import { useBluetooth } from '@/contexts/bluetooth-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function HelpScreen() {
  const { latestSensorData, isConnected } = useBluetooth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "👋 Hello! I'm your soil advisory assistant. I can help you understand your current soil conditions, suggest improvements, and recommend suitable crops.\n\nHow can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const generateResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase();
    
    // Get current sensor data context
    const soilContext = latestSensorData && isConnected
      ? `\n\n📊 Current Soil Data:\n• Nitrogen: ${latestSensorData.nitrogen || 'N/A'}\n• Phosphorus: ${latestSensorData.phosphorus || 'N/A'}\n• Potassium: ${latestSensorData.potassium || 'N/A'}\n• pH: ${latestSensorData.pH || 'N/A'}\n• Moisture: ${latestSensorData.moisture || 'N/A'}%`
      : '\n\n⚠️ No live soil data available. Please connect to your ESP32 device in the Devices tab.';

    // Current soil condition queries
    if (msg.includes('current') || msg.includes('condition') || msg.includes('status')) {
      if (!isConnected || !latestSensorData) {
        return "I don't have access to current soil readings. Please connect your ESP32 device in the Devices tab to get real-time soil data.";
      }
      
      const { nitrogen, phosphorus, potassium, pH, moisture } = latestSensorData;
      let analysis = "📊 Current Soil Analysis:\n\n";
      
      // NPK Analysis
      if (nitrogen !== null) {
        analysis += nitrogen < 20 ? "🔴 Nitrogen: LOW - Add nitrogen-rich fertilizers or compost\n" :
                    nitrogen > 40 ? "🟡 Nitrogen: HIGH - Reduce nitrogen inputs\n" :
                    "🟢 Nitrogen: OPTIMAL\n";
      }
      
      if (phosphorus !== null) {
        analysis += phosphorus < 10 ? "🔴 Phosphorus: LOW - Add bone meal or rock phosphate\n" :
                     phosphorus > 30 ? "🟡 Phosphorus: HIGH - Reduce phosphate fertilizers\n" :
                     "🟢 Phosphorus: OPTIMAL\n";
      }
      
      if (potassium !== null) {
        analysis += potassium < 20 ? "🔴 Potassium: LOW - Add potash or wood ash\n" :
                    potassium > 40 ? "🟡 Potassium: HIGH - Reduce potassium inputs\n" :
                    "🟢 Potassium: OPTIMAL\n";
      }
      
      if (pH !== null) {
        analysis += pH < 6.0 ? "🔴 pH: ACIDIC - Add lime to raise pH\n" :
                    pH > 7.5 ? "🔴 pH: ALKALINE - Add sulfur or organic matter\n" :
                    "🟢 pH: OPTIMAL (6.0-7.5)\n";
      }
      
      if (moisture !== null) {
        analysis += moisture < 30 ? "🔴 Moisture: DRY - Increase irrigation\n" :
                    moisture > 80 ? "🔴 Moisture: WET - Improve drainage\n" :
                    "🟢 Moisture: ADEQUATE\n";
      }
      
      return analysis;
    }

    // Improvement suggestions
    if (msg.includes('improve') || msg.includes('fix') || msg.includes('better')) {
      return `💡 General Soil Improvement Tips:\n\n1. Add Organic Matter: Compost improves soil structure and nutrient retention\n2. Test Regularly: Monitor nutrient levels every 3-6 months\n3. Mulch: Helps retain moisture and adds nutrients\n4. Crop Rotation: Different crops have different nutrient needs\n5. Cover Crops: Plant legumes to fix nitrogen naturally${soilContext}`;
    }

    // Crop recommendations
    if (msg.includes('crop') || msg.includes('plant') || msg.includes('grow') || msg.includes('cultivate')) {
      if (!isConnected || !latestSensorData) {
        return "Connect your device to get personalized crop recommendations based on your soil data!";
      }
      
      const { nitrogen, phosphorus, potassium, pH } = latestSensorData;
      let recommendations = "🌱 Crop Recommendations:\n\n";
      
      // Basic crop suggestions based on NPK and pH
      if (pH && pH >= 6.0 && pH <= 7.0) {
        if (nitrogen && nitrogen > 25) {
          recommendations += "✓ Leafy Greens: Lettuce, Spinach, Kale\n✓ Brassicas: Broccoli, Cabbage, Cauliflower\n";
        }
        if (phosphorus && phosphorus > 15) {
          recommendations += "✓ Root Vegetables: Carrots, Beets, Potatoes\n✓ Legumes: Beans, Peas\n";
        }
        if (potassium && potassium > 20) {
          recommendations += "✓ Fruiting Plants: Tomatoes, Peppers, Cucumbers\n";
        }
      } else if (pH && pH < 6.0) {
        recommendations += "🔵 Acid-Loving Plants:\n✓ Blueberries\n✓ Azaleas\n✓ Potatoes\n";
      } else if (pH && pH > 7.5) {
        recommendations += "🔵 Alkaline-Tolerant Plants:\n✓ Asparagus\n✓ Beets\n✓ Cabbage\n";
      }
      
      recommendations += `${soilContext}`;
      return recommendations;
    }

    // Nitrogen specific
    if (msg.includes('nitrogen') || msg.includes('n ')) {
      return "🌿 Nitrogen Information:\n\nRole: Promotes leaf growth and green color\n\nSources:\n• Compost\n• Blood meal\n• Fish emulsion\n• Legume cover crops\n\nDeficiency Signs: Yellow leaves, stunted growth\nExcess Signs: Dark green leaves, delayed flowering";
    }

    // Phosphorus specific
    if (msg.includes('phosphorus') || msg.includes('p ')) {
      return "🌸 Phosphorus Information:\n\nRole: Supports root development and flowering\n\nSources:\n• Bone meal\n• Rock phosphate\n• Compost\n\nDeficiency Signs: Purple leaves, poor flowering\nExcess Signs: Reduced micronutrient availability";
    }

    // Potassium specific
    if (msg.includes('potassium') || msg.includes('k ')) {
      return "🍎 Potassium Information:\n\nRole: Enhances fruit quality and disease resistance\n\nSources:\n• Wood ash\n• Kelp meal\n• Compost\n\nDeficiency Signs: Yellow leaf edges, weak stems\nExcess Signs: Reduced calcium and magnesium uptake";
    }

    // pH specific
    if (msg.includes('ph') || msg.includes('acid') || msg.includes('alkaline')) {
      return "⚗️ Soil pH Information:\n\nOptimal Range: 6.0-7.5 for most crops\n\nTo Raise pH (acidic soil):\n• Add lime (calcium carbonate)\n• Add wood ash\n\nTo Lower pH (alkaline soil):\n• Add sulfur\n• Add organic matter\n• Use acidic fertilizers\n\npH affects nutrient availability!";
    }

    // Default response
    return `I can help you with:\n\n• Current soil conditions\n• Improvement suggestions\n• Crop recommendations\n• Nutrient information (N, P, K, pH)\n\nWhat would you like to know?${soilContext}`;
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateResponse(inputText),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 800);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.botBubble]}>
      <Text style={[styles.messageText, item.isUser ? styles.userText : styles.botText]}>
        {item.text}
      </Text>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="chatbubbles" size={28} color="#e0daca" />
        <Text style={styles.headerTitle}>Soil Advisor</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {isTyping && (
          <View style={[styles.messageBubble, styles.botBubble]}>
            <ActivityIndicator size="small" color="#0bda95" />
            <Text style={[styles.messageText, styles.botText]}>Typing...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about soil or crops..."
            placeholderTextColor="#9e9c93"
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  chatContainer: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0bda95',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#46474a',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#525560',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#1a1a1c',
    fontWeight: '500',
  },
  botText: {
    color: '#e0daca',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(224, 218, 202, 0.5)',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#46474a',
    borderTopWidth: 1,
    borderTopColor: '#525560',
  },
  input: {
    flex: 1,
    backgroundColor: '#3a3d42',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#e0daca',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#525560',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0bda95',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#525560',
  },
});
