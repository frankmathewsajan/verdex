import { StyleSheet } from 'react-native';

export const createRecommendationStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },

    // Loading states
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background + 'E6',
      gap: 16,
    },

    // Empty state
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 16,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },

    // Crop Selection View
    scrollView: {
      flex: 1,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 22,
    },

    // Crop Grid
    cropGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    cropCard: {
      width: '48%',
      aspectRatio: 1,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    cropEmoji: {
      fontSize: 48,
    },
    cropName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },

    // Add Crop Button
    addCropButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      gap: 12,
      opacity: 0.6,
    },
    addCropText: {
      fontSize: 16,
      fontWeight: '600',
    },
    comingSoonBadge: {
      fontSize: 12,
      fontWeight: '700',
      color: '#F59E0B',
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },

    // Prescription View
    prescriptionScroll: {
      flex: 1,
    },
    prescriptionContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    prescriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      marginBottom: 20,
    },
    prescriptionEmoji: {
      fontSize: 40,
    },
    prescriptionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },

    // Data Context
    dataContext: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
    },
    dataContextLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    dataContextValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },

    // Prescription List
    prescriptionList: {
      marginBottom: 24,
    },
    listTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    prescriptionItem: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    itemNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemNumberText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    itemType: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    itemDescription: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
      paddingLeft: 40,
    },
    itemAmount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginLeft: 40,
      alignSelf: 'flex-start',
    },
    itemAmountText: {
      fontSize: 15,
      fontWeight: '600',
    },

    // Notes Section
    notesSection: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F59E0B',
    },
    notesTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#92400E',
      marginBottom: 8,
    },
    notesText: {
      fontSize: 14,
      color: '#92400E',
      lineHeight: 20,
    },

    // Action Bar (Floating Right Side)
    actionBar: {
      width: 80,
      paddingVertical: 20,
      alignItems: 'center',
      gap: 24,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 4,
    },
    actionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    actionButtonDisabled: {
      opacity: 0.4,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },

    // Header Action Buttons
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerActionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerActionButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    headerActionButtonStop: {
      backgroundColor: '#ef4444',
      borderColor: '#ef4444',
    },
    headerActionButtonDisabled: {
      opacity: 0.4,
    },

    // Audio Control Menu
    audioMenu: {
      position: 'absolute',
      top: 42,
      right: 0,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 1000,
      minWidth: 140,
    },
    audioMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    audioMenuText: {
      fontSize: 15,
      fontWeight: '500',
    },

    // Floating Audio Player (Bottom Right)
    floatingAudioPlayer: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      borderRadius: 12,
      padding: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
      zIndex: 1000,
    },
    audioPlayerWrapper: {
      alignItems: 'center',
      gap: 6,
    },
    audioPlayerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    audioPlayerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    audioPlayerLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: '#fff',
    },
    audioPlayerStatus: {
      fontSize: 9,
      textAlign: 'center',
      marginTop: 4,
      color: '#fff',
    },
  });
