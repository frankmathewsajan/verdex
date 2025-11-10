import { useBluetooth } from '@/contexts/bluetooth-context';
import { useTheme } from '@/contexts/theme-context';
import { createHelpStyles } from '@/styles/help.styles';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function HelpScreen() {
  const { colors } = useTheme();
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

  const styles = createHelpStyles(colors);

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
        <Ionicons name="chatbubbles" size={28} color={colors.text} />
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
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.messageText, styles.botText]}>Typing...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about soil or crops..."
            placeholderTextColor={colors.textSecondary}
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
