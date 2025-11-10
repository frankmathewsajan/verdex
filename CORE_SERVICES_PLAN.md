# Core Services Implementation Plan

## Overview
This document outlines the implementation plan for the three core services that will be used across multiple screens (History, Recommendation).

## Service 1: Report Generation (PDF)

### Purpose
Generate PDF reports for history data (30-day trends) and recommendations (current prescriptions).

### Implementation
**File**: `utils/report-generator.ts`

### Features

#### History Report
- **Title**: "Soil Analysis Report - Last 30 Days"
- **Date Range**: Automatically calculated (today - 30 days)
- **Sections**:
  1. Summary Statistics
     - Average values for all 6 parameters
     - Min/max values
     - Data collection frequency
  2. Trend Graphs
     - Line charts for each parameter over time
     - Color-coded by health status
  3. Location Map
     - Show all collection points with path
     - Highlight areas of concern
  4. Recommendations Summary
     - Based on trend analysis

#### Recommendation Report
- **Title**: "Soil Treatment Prescription"
- **Date**: Current date
- **Sections**:
  1. Current Soil Analysis
     - Most recent sensor reading
     - Health percentage for each parameter
  2. Fertilizer Recommendations
     - NPK levels needed
     - Specific products/amounts
     - Application method
  3. pH Adjustment
     - Current vs optimal pH
     - Recommended amendments
  4. Moisture Management
     - Current moisture level
     - Irrigation recommendations

### Technology Stack
- **expo-print**: For PDF generation
- **react-native-svg**: For charts in PDF
- **expo-sharing**: For sharing/saving PDFs

### Installation Required
```bash
npx expo install expo-print expo-sharing
```

### Usage Examples

```typescript
// In History Screen
import { generateHistoryReport } from '@/utils/report-generator';

const handleGenerateReport = async () => {
  try {
    const pdfUri = await generateHistoryReport(userId, dateRange);
    // Share or save PDF
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Soil Analysis Report',
      UTI: 'com.adobe.pdf'
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
  }
};

// In Recommendation Screen
import { generateRecommendationReport } from '@/utils/report-generator';

const handleGenerateReport = async () => {
  try {
    const pdfUri = await generateRecommendationReport(latestReading, recommendations);
    await Sharing.shareAsync(pdfUri);
  } catch (error) {
    console.error('Failed to generate report:', error);
  }
};
```

---

## Service 2: Messaging (SMS)

### Purpose
Send soil treatment prescriptions via SMS to farmers' phone numbers.

### Implementation
**File**: `utils/messaging.ts`

### Features
- Format prescription into readable SMS text
- Support for multiple languages (English, Hindi, Telugu)
- Include key recommendations (NPK, pH, moisture)
- Character limit optimization (160 chars per SMS)
- Link to full report/app

### Technology Stack
- **expo-sms**: For SMS composition
- **React Native Linking**: Fallback for SMS URLs

### Installation Required
```bash
npx expo install expo-sms
```

### SMS Format Template

**English:**
```
🌱 Verdex Soil Report
N: [value] P: [value] K: [value]
pH: [value] | Health: [%]
Recommendation: [brief]
View full: [app-link]
```

**Hindi:**
```
🌱 मिट्टी रिपोर्ट
नाइट्रोजन: [value] फास्फोरस: [value] पोटाश: [value]
pH: [value] | स्वास्थ्य: [%]
सुझाव: [brief]
```

**Telugu:**
```
🌱 నేల నివేదిక
N: [value] P: [value] K: [value]
pH: [value] | ఆరోగ్యం: [%]
సిఫార్సు: [brief]
```

### Usage Example

```typescript
import { sendPrescriptionSMS } from '@/utils/messaging';

const handleSendSMS = async () => {
  try {
    const result = await sendPrescriptionSMS({
      phoneNumber: userProfile.phone,
      language: userProfile.language, // 'english' | 'hindi' | 'telugu'
      data: latestReading,
      recommendations: recommendations,
    });
    
    if (result.result === 'sent') {
      // Success
      Alert.alert('Success', 'Prescription sent via SMS');
    }
  } catch (error) {
    console.error('Failed to send SMS:', error);
  }
};
```

---

## Service 3: Voice (Text-to-Speech)

### Purpose
Read prescription aloud in user's preferred language (English, Hindi, Telugu).

### Implementation
**File**: `utils/voice.ts`

### Features
- Convert prescription text to speech
- Support 3 languages
- Adjustable speech rate (slow/normal/fast)
- Play/pause/stop controls
- Background playback

### Technology Stack
- **expo-speech**: For TTS functionality
- Built-in support for multiple languages

### Installation Required
```bash
npx expo install expo-speech
```

### Language Codes
- English: `en-IN` (Indian English)
- Hindi: `hi-IN`
- Telugu: `te-IN`

### Usage Example

```typescript
import { speakPrescription, stopSpeaking } from '@/utils/voice';

const handleReadAloud = async () => {
  try {
    // Get language from user profile
    const language = userProfile.language; // 'english' | 'hindi' | 'telugu'
    
    await speakPrescription({
      language: language,
      data: latestReading,
      recommendations: recommendations,
      rate: 0.9, // Slightly slower for clarity
    });
  } catch (error) {
    console.error('Failed to speak:', error);
  }
};

const handleStop = () => {
  stopSpeaking();
};
```

### Prescription Script Template

**English:**
```
Hello farmer. Here is your soil analysis report.
Nitrogen level is [value] kilograms per hectare.
Phosphorus level is [value] kilograms per hectare.
Potassium level is [value] kilograms per hectare.
Soil pH is [value].
Overall soil health is [percentage] percent.

Recommendations:
[Read each recommendation slowly]

Thank you for using Verdex.
```

**Hindi:**
```
नमस्ते किसान भाई। यह आपकी मिट्टी परीक्षण रिपोर्ट है।
नाइट्रोजन स्तर [value] किलोग्राम प्रति हेक्टेयर है।
...
```

**Telugu:**
```
నమస్కారం రైతు గారు. ఇది మీ నేల విశ్లేషణ నివేదిక.
నత్రజని స్థాయి [value] కిలోగ్రాములు ప్రతి హెక్టార్.
...
```

---

## Integration Points

### History Screen (`app/(tabs)/history.tsx`)
- Add "Generate Report" button → Calls `generateHistoryReport()`
- Add "Share via SMS" button → Calls `sendPrescriptionSMS()`
- Optional: Add voice summary of trends

### Recommendation Screen (`app/(tabs)/recommendation.tsx`)
- Add "Generate PDF" button → Calls `generateRecommendationReport()`
- Add "Send SMS" button → Calls `sendPrescriptionSMS()`
- Add "Read Aloud" button → Calls `speakPrescription()`
- Add speaker icon to toggle TTS on/off

### Required Database Fields
From `profiles` table:
- `phone`: Phone number for SMS
- `language`: 'english' | 'hindi' | 'telugu' for TTS/SMS language

---

## Implementation Priority

1. **Voice Service (TTS)** - Easiest to implement
   - Single dependency (expo-speech)
   - No external APIs needed
   - Immediate user value

2. **Report Generation (PDF)** - Medium complexity
   - Requires data aggregation
   - Chart generation
   - Formatting

3. **Messaging (SMS)** - Requires testing
   - Device SMS access
   - Character limit handling
   - Multi-language formatting

---

## Next Steps

1. Install required dependencies:
   ```bash
   npx expo install expo-speech expo-print expo-sharing expo-sms
   ```

2. Create service files in order:
   - `utils/voice.ts` (TTS service)
   - `utils/report-generator.ts` (PDF service)
   - `utils/messaging.ts` (SMS service)

3. Update screens:
   - Add buttons to Recommendation screen
   - Add buttons to History screen
   - Add loading states and error handling

4. Test each service:
   - TTS with all 3 languages
   - PDF generation with sample data
   - SMS with proper formatting

---

## UI Button Placement

### Recommendation Screen
```
┌─────────────────────────────┐
│  Recommendation Header      │
├─────────────────────────────┤
│  Current Data Display       │
│  Prescription Details       │
├─────────────────────────────┤
│  Action Buttons:            │
│  [📄 Generate PDF]          │
│  [📱 Send via SMS]          │
│  [🔊 Read Aloud]            │
└─────────────────────────────┘
```

### History Screen
```
┌─────────────────────────────┐
│  History Header             │
│  [Date Range Selector]      │
├─────────────────────────────┤
│  Trend Charts               │
│  Data Table                 │
├─────────────────────────────┤
│  Action Buttons:            │
│  [📄 Generate Report]       │
│  [📱 Share Summary]         │
└─────────────────────────────┘
```

---

## Testing Checklist

### Voice Service
- [ ] Test English TTS with sample prescription
- [ ] Test Hindi TTS with sample prescription
- [ ] Test Telugu TTS with sample prescription
- [ ] Test play/pause/stop controls
- [ ] Test speech rate adjustment
- [ ] Test on different devices (Android/iOS)

### Report Generation
- [ ] Test history report with 30 days data
- [ ] Test recommendation report with current data
- [ ] Test PDF formatting on different screen sizes
- [ ] Test chart generation
- [ ] Test PDF sharing
- [ ] Test PDF saving to device

### Messaging
- [ ] Test SMS composition with proper format
- [ ] Test character limit handling
- [ ] Test multi-language SMS
- [ ] Test on different devices
- [ ] Test SMS sending/cancellation
- [ ] Verify phone number validation

---

## Notes
- All services should gracefully handle missing data
- Implement proper error messages for each service
- Add loading indicators during PDF generation
- Store user's last used language preference
- Consider offline mode for voice service
- PDF reports should include Verdex branding/logo
