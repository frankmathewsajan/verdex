import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { createCalendarStyles } from '@/styles/history-calendar.styles';
import { createHistoryStyles } from '@/styles/history.styles';
import { generateHistoryReport, shareReport } from '@/utils/report-generator';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 220;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_BOTTOM = 30;
const CHART_PADDING_LEFT = 35;
const CHART_PADDING_RIGHT = 15;
const MIN_POINT_SPACING = 50; // Minimum space between data points

interface SensorReading {
  id: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  pH?: number;
  moisture: number;
  temperature: number;
  user_id: string;
}

interface DailyAverage {
  date: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  moisture: number;
  temperature: number;
  count: number;
}

interface DateReading {
  time: string;
  location: string;
  data: SensorReading;
}

const metrics = [
  { key: 'nitrogen', label: 'Nitrogen', unit: 'mg/kg', color: '#32cd32' },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg/kg', color: '#ff69b4' },
  { key: 'potassium', label: 'Potassium', unit: 'mg/kg', color: '#9370db' },
  { key: 'ph', label: 'pH', unit: '', color: '#ff6347' },
  { key: 'moisture', label: 'Moisture', unit: '%', color: '#1e90ff' },
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#ffa500' },
];

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [dailyAverages, setDailyAverages] = useState<DailyAverage[]>([]);
  const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateReadings, setDateReadings] = useState<DateReading[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<keyof DailyAverage>('nitrogen');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const styles = createHistoryStyles(colors);
  const calendarStyles = createCalendarStyles(colors);

  const calculateDailyAverages = (data: SensorReading[]): DailyAverage[] => {
    const dailyMap = new Map<string, SensorReading[]>();

    data.forEach(reading => {
      const date = new Date(reading.created_at).toISOString().split('T')[0];
      if (!dailyMap.has(date)) dailyMap.set(date, []);
      dailyMap.get(date)!.push(reading);
    });

    const averages: DailyAverage[] = [];
    dailyMap.forEach((readings, date) => {
      const sum = (key: keyof SensorReading) => 
        readings.reduce((s, r) => s + (Number(r[key] || (key === 'ph' ? r.pH : 0)) || 0), 0);
      
      averages.push({
        date,
        nitrogen: sum('nitrogen') / readings.length,
        phosphorus: sum('phosphorus') / readings.length,
        potassium: sum('potassium') / readings.length,
        ph: sum('ph') / readings.length,
        moisture: sum('moisture') / readings.length,
        temperature: sum('temperature') / readings.length,
        count: readings.length,
      });
    });

    return averages.sort((a, b) => a.date.localeCompare(b.date));
  };

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('user_id', user.uid)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      Alert.alert('Error', 'Failed to fetch history');
    } else {
      setReadings(data || []);
      const averages = calculateDailyAverages(data || []);
      setDailyAverages(averages);
      setDatesWithData(new Set(averages.map(avg => avg.date)));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const generateCalendar = (monthDate: Date) => {
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    const calendar: (string | null)[][] = [];
    let week: (string | null)[] = [];

    const firstDay = startDate.getDay();
    for (let i = 0; i < firstDay; i++) week.push(null);

    const current = new Date(startDate);
    while (current <= endDate) {
      week.push(current.toISOString().split('T')[0]);
      if (week.length === 7) {
        calendar.push(week);
        week = [];
      }
      current.setDate(current.getDate() + 1);
    }

    while (week.length > 0 && week.length < 7) week.push(null);
    if (week.length > 0) calendar.push(week);

    return calendar;
  };

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    const today = new Date();
    if (newMonth <= today) {
      setCurrentMonth(newMonth);
    }
  };

  const handleDatePress = (date: string) => {
    if (!datesWithData.has(date)) return;

    setSelectedDate(date);
    const dayReadings = readings.filter(r => 
      new Date(r.created_at).toISOString().split('T')[0] === date
    );

    setDateReadings(dayReadings.map(r => ({
      time: new Date(r.created_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      location: r.latitude && r.longitude 
        ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`
        : 'No GPS',
      data: r,
    })));
    setShowModal(true);
  };

  const generateChartPath = () => {
    if (dailyAverages.length === 0) return { 
      path: '', 
      minValue: 0, 
      maxValue: 0, 
      dates: [], 
      chartWidth: SCREEN_WIDTH - 60,
      chartHeight: CHART_HEIGHT,
    };

    const values = dailyAverages.map(avg => avg[selectedMetric as keyof DailyAverage] as number);
    const dates = dailyAverages.map(avg => avg.date);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // Calculate dynamic width based on number of points (minimum spacing between points)
    const dynamicChartWidth = Math.max(
      SCREEN_WIDTH - 60,
      CHART_PADDING_LEFT + CHART_PADDING_RIGHT + (values.length - 1) * MIN_POINT_SPACING
    );
    
    const chartHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
    const stepX = (dynamicChartWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT) / Math.max(values.length - 1, 1);

    const points = values.map((value, index) => {
      const x = CHART_PADDING_LEFT + index * stepX;
      const y = CHART_PADDING_TOP + chartHeight - ((value - minValue) / range * chartHeight);
      return `${x},${y}`;
    });

    // Generate circle points for data markers
    const circles = values.map((value, index) => {
      const x = CHART_PADDING_LEFT + index * stepX;
      const y = CHART_PADDING_TOP + chartHeight - ((value - minValue) / range * chartHeight);
      return { x, y, value };
    });

    return { 
      path: `M ${points.join(' L ')}`,
      circles,
      minValue: minValue.toFixed(1),
      maxValue: maxValue.toFixed(1),
      dates,
      chartWidth: dynamicChartWidth,
      chartHeight: CHART_HEIGHT,
    };
  };

  const handleGenerateReport = async () => {
    if (!user || readings.length === 0) return;
    setGeneratingReport(true);
    try {
      console.log('📄 Generating history report...');
      const uri = await generateHistoryReport({ userId: user.uid, days: 30 });
      console.log('✅ Report generated:', uri);
      await shareReport(uri, 'Verdex_History_Report.pdf');
      console.log('✅ Report shared');
    } catch (error: any) {
      console.error('❌ Error generating history report:', error);
      Alert.alert('Error', error?.message || 'Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const calendar = generateCalendar(currentMonth);
  const chartData = generateChartPath();
  const selectedMetricInfo = metrics.find(m => m.key === selectedMetric)!;
  const canGoNext = currentMonth < new Date();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Last 30 days data analysis</Text>
        </View>

        {/* Generate Report Button */}
        <View style={calendarStyles.reportButtonContainer}>
          <TouchableOpacity
            style={[calendarStyles.reportButton, { backgroundColor: colors.primary }]}
            onPress={handleGenerateReport}
            disabled={generatingReport || readings.length === 0}
          >
            <Ionicons name="document-text" size={20} color="#fff" />
            <Text style={calendarStyles.reportButtonText}>
              {generatingReport ? 'Generating...' : 'Generate PDF Report'}
            </Text>
          </TouchableOpacity>
        </View>

        {readings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyDescription}>
              Start collecting soil data to see your history
            </Text>
          </View>
        ) : (
          <>
            {/* Calendar */}
            <View style={calendarStyles.section}>
              <View style={calendarStyles.calendarHeaderRow}>
                <TouchableOpacity 
                  onPress={goToPreviousMonth}
                  style={calendarStyles.navButton}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                
                <View style={calendarStyles.monthTitleContainer}>
                  <Text style={calendarStyles.monthTitle}>{monthName}</Text>
                  <Text style={calendarStyles.sectionSubtitle}>Tap highlighted dates for details</Text>
                </View>

                <TouchableOpacity 
                  onPress={goToNextMonth}
                  style={calendarStyles.navButton}
                  disabled={!canGoNext}
                >
                  <Ionicons 
                    name="chevron-forward" 
                    size={24} 
                    color={canGoNext ? colors.primary : colors.border} 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={calendarStyles.calendarContainer}>
                <View style={calendarStyles.calendarHeader}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <Text key={day} style={calendarStyles.dayHeader}>{day}</Text>
                  ))}
                </View>

                {calendar.map((week, weekIndex) => (
                  <View key={weekIndex} style={calendarStyles.calendarWeek}>
                    {week.map((date, dayIndex) => {
                      if (!date) {
                        return <View key={`empty-${dayIndex}`} style={calendarStyles.calendarDay} />;
                      }

                      const hasData = datesWithData.has(date);
                      const dayNumber = new Date(date).getDate();

                      return (
                        <TouchableOpacity
                          key={date}
                          style={[
                            calendarStyles.calendarDay,
                            hasData && { 
                              backgroundColor: colors.primary + '30', 
                              borderColor: colors.primary 
                            },
                          ]}
                          onPress={() => handleDatePress(date)}
                          disabled={!hasData}
                        >
                          <Text style={[
                            calendarStyles.calendarDayText,
                            hasData && { color: colors.text, fontWeight: '600' },
                          ]}>
                            {dayNumber}
                          </Text>
                          {hasData && (
                            <View style={[
                              calendarStyles.dataDot, 
                              { backgroundColor: colors.primary }
                            ]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              <View style={calendarStyles.calendarLegend}>
                <View style={calendarStyles.legendItem}>
                  <View style={[
                    calendarStyles.legendBox, 
                    { backgroundColor: colors.primary + '30', borderColor: colors.primary }
                  ]} />
                  <Text style={calendarStyles.legendText}>Has Data</Text>
                </View>
                <View style={calendarStyles.legendItem}>
                  <View style={[
                    calendarStyles.legendBox, 
                    { backgroundColor: 'transparent', borderColor: colors.border }
                  ]} />
                  <Text style={calendarStyles.legendText}>No Data</Text>
                </View>
              </View>
            </View>

            {/* Trend Graph */}
            <View style={calendarStyles.section}>
              <Text style={calendarStyles.sectionTitle}>Daily Trends</Text>
              <Text style={calendarStyles.sectionSubtitle}>
                Average values per day ({dailyAverages.length} days)
              </Text>

              {/* Metric Selector - Grid Layout */}
              <View style={calendarStyles.metricGrid}>
                {metrics.map(metric => (
                  <TouchableOpacity
                    key={metric.key}
                    style={[
                      calendarStyles.metricChip,
                      { borderColor: metric.color },
                      selectedMetric === metric.key && { 
                        backgroundColor: metric.color,
                      },
                    ]}
                    onPress={() => setSelectedMetric(metric.key as keyof DailyAverage)}
                  >
                    <View style={[
                      calendarStyles.metricDot,
                      { backgroundColor: selectedMetric === metric.key ? '#fff' : metric.color }
                    ]} />
                    <Text style={[
                      calendarStyles.metricLabel,
                      selectedMetric === metric.key && { color: '#fff', fontWeight: '700' },
                    ]}>
                      {metric.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chart */}
              <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                {/* Y-axis label */}
                <View style={calendarStyles.yAxisLabel}>
                  <Text style={[calendarStyles.axisLabelText, { color: colors.textSecondary }]}>
                    {selectedMetricInfo.label} {selectedMetricInfo.unit && `(${selectedMetricInfo.unit})`}
                  </Text>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                  style={calendarStyles.chartScroll}
                  contentContainerStyle={{ paddingRight: 20 }}
                >
                  <Svg width={chartData.chartWidth} height={chartData.chartHeight}>
                    {/* Y-axis */}
                    <Line
                      x1={CHART_PADDING_LEFT}
                      y1={CHART_PADDING_TOP}
                      x2={CHART_PADDING_LEFT}
                      y2={CHART_HEIGHT - CHART_PADDING_BOTTOM}
                      stroke={colors.border}
                      strokeWidth="1.5"
                    />
                    {/* X-axis */}
                    <Line
                      x1={CHART_PADDING_LEFT}
                      y1={CHART_HEIGHT - CHART_PADDING_BOTTOM}
                      x2={chartData.chartWidth - CHART_PADDING_RIGHT}
                      y2={CHART_HEIGHT - CHART_PADDING_BOTTOM}
                      stroke={colors.border}
                      strokeWidth="1.5"
                    />
                    {/* Data line */}
                    {chartData.path && (
                      <>
                        <Path
                          d={chartData.path}
                          stroke={selectedMetricInfo.color}
                          strokeWidth="2.5"
                          fill="none"
                        />
                        {/* Data points */}
                        {chartData.circles?.map((point, index) => (
                          <Circle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill={selectedMetricInfo.color}
                            stroke="#fff"
                            strokeWidth="1.5"
                          />
                        ))}
                      </>
                    )}
                  </Svg>
                  
                  {/* Date labels below chart */}
                  <View style={calendarStyles.dateLabelsContainer}>
                    {chartData.circles?.map((point, index) => {
                      const date = new Date(chartData.dates[index]);
                      const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;
                      return (
                        <Text
                          key={index}
                          style={[
                            calendarStyles.dateLabel,
                            { 
                              position: 'absolute',
                              left: point.x - 15,
                              color: colors.textSecondary,
                            }
                          ]}
                        >
                          {dateLabel}
                        </Text>
                      );
                    })}
                  </View>
                </ScrollView>

                {dailyAverages.length > 5 && (
                  <View style={calendarStyles.scrollHint}>
                    <Ionicons name="arrow-forward" size={12} color={colors.textSecondary} />
                    <Text style={[calendarStyles.scrollHintText, { color: colors.textSecondary }]}>
                      Scroll to see all data points
                    </Text>
                  </View>
                )}

                {/* X-axis label */}
                <View style={calendarStyles.xAxisLabel}>
                  <Text style={[calendarStyles.axisLabelText, { color: colors.textSecondary }]}>
                    Date
                  </Text>
                </View>

                {/* Value range */}
                <View style={calendarStyles.valueRange}>
                  <View style={calendarStyles.valueItem}>
                    <Text style={calendarStyles.valueLabel}>Min</Text>
                    <Text style={[calendarStyles.valueText, { color: selectedMetricInfo.color }]}>
                      {chartData.minValue}{selectedMetricInfo.unit}
                    </Text>
                  </View>
                  <View style={calendarStyles.valueItem}>
                    <Text style={calendarStyles.valueLabel}>Max</Text>
                    <Text style={[calendarStyles.valueText, { color: selectedMetricInfo.color }]}>
                      {chartData.maxValue}{selectedMetricInfo.unit}
                    </Text>
                  </View>
                  <View style={calendarStyles.valueItem}>
                    <Text style={calendarStyles.valueLabel}>Avg</Text>
                    <Text style={[calendarStyles.valueText, { color: selectedMetricInfo.color }]}>
                      {((Number(chartData.minValue) + Number(chartData.maxValue)) / 2).toFixed(1)}{selectedMetricInfo.unit}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Date Details Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={calendarStyles.modalOverlay}>
          <View style={[calendarStyles.modalContent, { backgroundColor: colors.card }]}>
            <View style={calendarStyles.modalHeader}>
              <Text style={calendarStyles.modalTitle}>
                {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={calendarStyles.modalScroll}>
              <Text style={calendarStyles.modalSubtitle}>
                {dateReadings.length} reading{dateReadings.length !== 1 ? 's' : ''} collected
              </Text>

              {dateReadings.map((reading, index) => (
                <View 
                  key={index} 
                  style={[calendarStyles.readingCard, { backgroundColor: colors.background }]}
                >
                  <View style={calendarStyles.readingHeader}>
                    <View style={calendarStyles.readingTime}>
                      <Ionicons name="time" size={16} color={colors.primary} />
                      <Text style={calendarStyles.readingTimeText}>{reading.time}</Text>
                    </View>
                    <View style={calendarStyles.readingLocation}>
                      <Ionicons name="location" size={16} color={colors.textSecondary} />
                      <Text style={calendarStyles.readingLocationText}>{reading.location}</Text>
                    </View>
                  </View>

                  <View style={calendarStyles.readingDataGrid}>
                    {metrics.map(metric => (
                      <View key={metric.key} style={calendarStyles.readingDataItem}>
                        <Text style={calendarStyles.readingDataLabel}>{metric.label}</Text>
                        <Text style={[
                          calendarStyles.readingDataValue, 
                          { color: metric.color }
                        ]}>
                          {(reading.data[metric.key as keyof SensorReading] as number)?.toFixed(1) || 
                           (metric.key === 'ph' ? reading.data.pH?.toFixed(1) : 'N/A')}
                        </Text>
                        <Text style={calendarStyles.readingDataUnit}>{metric.unit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
