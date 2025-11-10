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

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputText.trim();
    setInputText('');
    setIsTyping(true);

    try {
      const payload = {
        question,
        ...(latestSensorData && isConnected && {
          context: {
            nitrogen: latestSensorData.nitrogen,
            phosphorus: latestSensorData.phosphorus,
            potassium: latestSensorData.potassium,
            ph: latestSensorData.pH,
            moisture: latestSensorData.moisture
          }
        })
      };

      const response = await fetch('https://kdlhvlpoldivrweyjrfg.supabase.co/functions/v1/green-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.answer || data.response || 'Sorry, I could not process your request.',
        isUser: false,
        timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: '⚠️ Unable to connect. Please check your internet connection.',
        isUser: false,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
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
