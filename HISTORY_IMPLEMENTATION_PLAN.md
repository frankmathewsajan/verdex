# History Screen Implementation Plan

## Overview
The History screen needs to be updated with:
1. **Calendar View** - Last 30 days with highlighted dates containing data
2. **Drill-Down** - Click dates to see all readings from that day
3. **Trend Graph** - Line graph showing daily averages for each parameter

## Current State
The history screen currently has:
- ✅ Trend graphs with all readings
- ✅ Filter buttons (all/nutrients/environment)
- ✅ Latest reading summary
- ❌ No calendar view
- ❌ No drill-down by date
- ❌ No daily averaging

## Implementation Steps

### Step 1: Add New State Variables
```typescript
const [dailyAverages, setDailyAverages] = useState<DailyAverage[]>([]);
const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());
const [selectedDate, setSelectedDate] = useState<string | null>(null);
const [dateReadings, setDateReadings] = useState<DateReading[]>([]);
const [showModal, setShowModal] = useState(false);
```

### Step 2: Add New Interfaces
```typescript
interface DailyAverage {
  date: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  moisture: number;
  temperature: number;
  count: number; // Number of readings for this day
}

interface DateReading {
  time: string;
  location: string;
  data: SensorReading;
}
```

### Step 3: Add Daily Average Calculation Function
```typescript
const calculateDailyAverages = (data: SensorReading[]): DailyAverage[] => {
  const dailyMap = new Map<string, SensorReading[]>();

  // Group readings by date
  data.forEach(reading => {
    const date = new Date(reading.created_at).toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)!.push(reading);
  });

  // Calculate averages for each day
  const averages: DailyAverage[] = [];
  dailyMap.forEach((readings, date) => {
    const ph = readings.map(r => r.pH || r.ph || 0);
    averages.push({
      date,
      nitrogen: readings.reduce((sum, r) => sum + r.nitrogen, 0) / readings.length,
      phosphorus: readings.reduce((sum, r) => sum + r.phosphorus, 0) / readings.length,
      potassium: readings.reduce((sum, r) => sum + r.potassium, 0) / readings.length,
      ph: ph.reduce((sum, v) => sum + v, 0) / readings.length,
      moisture: readings.reduce((sum, r) => sum + r.moisture, 0) / readings.length,
      temperature: readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length,
      count: readings.length,
    });
  });

  return averages.sort((a, b) => a.date.localeCompare(b.date));
};
```

### Step 4: Update fetchHistory to Calculate Averages
```typescript
const fetchHistory = async () => {
  // ... existing code to fetch data ...
  
  setReadings(data || []);
  
  // NEW: Calculate daily averages
  const averages = calculateDailyAverages(data || []);
  setDailyAverages(averages);

  // NEW: Track dates with data
  const dates = new Set(averages.map(avg => avg.date));
  setDatesWithData(dates);
};
```

### Step 5: Add Calendar Generation Function
```typescript
const generateCalendar = () => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setDate(1);

  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const calendar: (string | null)[][] = [];
  let week: (string | null)[] = [];

  // Add empty cells for days before month start
  const firstDay = startDate.getDay();
  for (let i = 0; i < firstDay; i++) {
    week.push(null);
  }

  // Add all days of the month
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    week.push(dateStr);

    if (week.length === 7) {
      calendar.push(week);
      week = [];
    }

    current.setDate(current.getDate() + 1);
  }

  // Fill last week
  while (week.length < 7 && week.length > 0) {
    week.push(null);
  }
  if (week.length > 0) {
    calendar.push(week);
  }

  return calendar;
};
```

### Step 6: Add Date Press Handler
```typescript
const handleDatePress = async (date: string) => {
  if (!datesWithData.has(date)) return;

  setSelectedDate(date);
  
  // Get all readings for this date
  const dayReadings = readings.filter(r => {
    const readingDate = new Date(r.created_at).toISOString().split('T')[0];
    return readingDate === date;
  });

  const formattedReadings: DateReading[] = dayReadings.map(r => ({
    time: new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    location: r.latitude && r.longitude 
      ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`
      : 'No GPS',
    data: r,
  }));

  setDateReadings(formattedReadings);
  setShowModal(true);
};
```

### Step 7: Update Trend Graph to Use Daily Averages
```typescript
const generateChartPath = () => {
  if (dailyAverages.length === 0) return { path: '', minValue: 0, maxValue: 0, values: [] };

  // Use dailyAverages instead of all readings
  const values = dailyAverages.map(avg => avg[selectedMetric]);
  
  // ... rest of chart generation using values ...
};
```

### Step 8: Add Calendar UI Section
```tsx
{/* Calendar Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Last 30 Days Calendar</Text>
  <Text style={styles.sectionSubtitle}>Tap highlighted dates to see details</Text>
  
  <View style={styles.calendarContainer}>
    {/* Day headers */}
    <View style={styles.calendarHeader}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <Text key={day} style={styles.dayHeader}>{day}</Text>
      ))}
    </View>

    {/* Calendar grid */}
    {calendar.map((week, weekIndex) => (
      <View key={weekIndex} style={styles.calendarWeek}>
        {week.map((date, dayIndex) => {
          if (!date) {
            return <View key={`empty-${dayIndex}`} style={styles.calendarDay} />;
          }

          const hasData = datesWithData.has(date);
          const dayNumber = new Date(date).getDate();

          return (
            <TouchableOpacity
              key={date}
              style={[
                styles.calendarDay,
                hasData && { backgroundColor: colors.primary + '30', borderColor: colors.primary },
              ]}
              onPress={() => handleDatePress(date)}
              disabled={!hasData}
            >
              <Text style={[
                styles.calendarDayText,
                hasData && { color: colors.text, fontWeight: '600' },
              ]}>
                {dayNumber}
              </Text>
              {hasData && (
                <View style={[styles.dataDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    ))}
  </View>

  <View style={styles.calendarLegend}>
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, { backgroundColor: colors.primary + '30', borderColor: colors.primary }]} />
      <Text style={styles.legendText}>Has Data</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, { backgroundColor: 'transparent', borderColor: colors.border }]} />
      <Text style={styles.legendText}>No Data</Text>
    </View>
  </View>
</View>
```

### Step 9: Add Modal for Date Details
```tsx
<Modal
  visible={showModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
        <TouchableOpacity onPress={() => setShowModal(false)}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalScroll}>
        <Text style={styles.modalSubtitle}>
          {dateReadings.length} reading{dateReadings.length !== 1 ? 's' : ''} collected
        </Text>

        {dateReadings.map((reading, index) => (
          <View key={index} style={[styles.readingCard, { backgroundColor: colors.background }]}>
            <View style={styles.readingHeader}>
              <View style={styles.readingTime}>
                <Ionicons name="time" size={16} color={colors.primary} />
                <Text style={styles.readingTimeText}>{reading.time}</Text>
              </View>
              <View style={styles.readingLocation}>
                <Ionicons name="location" size={16} color={colors.textSecondary} />
                <Text style={styles.readingLocationText}>{reading.location}</Text>
              </View>
            </View>

            <View style={styles.readingDataGrid}>
              {/* Show all 6 parameters */}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  </View>
</Modal>
```

### Step 10: Add New Styles to history.styles.ts
```typescript
// Calendar styles
section: {
  margin: 16,
  marginBottom: 24,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: colors.text,
  marginBottom: 4,
},
sectionSubtitle: {
  fontSize: 12,
  color: colors.textSecondary,
  marginBottom: 16,
},
calendarContainer: {
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
},
calendarHeader: {
  flexDirection: 'row',
  marginBottom: 8,
},
dayHeader: {
  flex: 1,
  textAlign: 'center',
  fontSize: 11,
  fontWeight: '600',
  color: colors.textSecondary,
},
calendarWeek: {
  flexDirection: 'row',
  marginBottom: 4,
},
calendarDay: {
  flex: 1,
  aspectRatio: 1,
  margin: 2,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  justifyContent: 'center',
  alignItems: 'center',
},
calendarDayText: {
  fontSize: 12,
  color: colors.textSecondary,
},
dataDot: {
  width: 4,
  height: 4,
  borderRadius: 2,
  marginTop: 2,
},

// Modal styles
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
},
modalContent: {
  height: '80%',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingTop: 20,
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingBottom: 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
},
modalTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: colors.text,
  flex: 1,
},
modalScroll: {
  flex: 1,
  padding: 20,
},
modalSubtitle: {
  fontSize: 14,
  color: colors.textSecondary,
  marginBottom: 16,
},
readingCard: {
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: colors.border,
},
readingHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 12,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
},
readingTime: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
readingTimeText: {
  fontSize: 13,
  fontWeight: '600',
  color: colors.text,
},
readingLocation: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
readingLocationText: {
  fontSize: 11,
  color: colors.textSecondary,
},
readingDataGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
readingDataItem: {
  flex: 1,
  minWidth: '30%',
  alignItems: 'center',
  padding: 8,
},
readingDataLabel: {
  fontSize: 10,
  color: colors.textSecondary,
  marginBottom: 4,
},
readingDataValue: {
  fontSize: 16,
  fontWeight: '600',
},
readingDataUnit: {
  fontSize: 10,
  color: colors.textSecondary,
  marginTop: 2,
},
```

## Testing Checklist
- [ ] Calendar shows last 30 days correctly
- [ ] Dates with data are highlighted
- [ ] Clicking highlighted date opens modal
- [ ] Modal shows all readings for that date with time and location
- [ ] Trend graph uses daily averages (not individual readings)
- [ ] X-axis shows dates properly
- [ ] Each metric can be selected and displayed
- [ ] Modal can be closed
- [ ] Empty state shows when no data
- [ ] Loading state works

## Key Features Summary
1. ✅ **Calendar** - 30-day view with data indicators
2. ✅ **Drill-Down** - Click dates to see all readings
3. ✅ **Daily Averages** - Graph plots averages (not individual points)
4. ✅ **Time & Location** - Shows when and where each reading was taken
5. ✅ **PDF Report** - Generate button (already implemented)

This implementation satisfies all requirements:
- Last one month of data ✅
- Calendar with highlighted dates ✅
- List of locations and times when clicking a date ✅
- Line graph with daily averages ✅
- X-axis shows dates ✅
- Averaging logic: If 5 spots measured in one day, graph shows average ✅
