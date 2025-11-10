import { StyleSheet } from 'react-native';

export const createCalendarStyles = (colors: any) => StyleSheet.create({
  // Sections
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },

  // Calendar
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
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
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Modal
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

  // Reading cards
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

  // Metric selector
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 5,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },

  // Chart scroll
  chartScroll: {
    marginVertical: 8,
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
  },
  scrollHintText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  dateLabelsContainer: {
    height: 20,
    marginTop: 4,
    position: 'relative',
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '500',
  },

  // Axis labels
  yAxisLabel: {
    marginBottom: 8,
    paddingLeft: 4,
  },
  xAxisLabel: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  axisLabelText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Value range
  valueRange: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
  },
  valueItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  valueLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Report button
  reportButtonContainer: {
    padding: 16,
    paddingTop: 0,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
