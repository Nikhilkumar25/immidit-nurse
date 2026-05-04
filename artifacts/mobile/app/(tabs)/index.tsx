import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CaseContext';
import { CaseCard } from '@/components/CaseCard';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import type { NurseCase } from '@/types/case';

export default function CasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cases, profile, loading } = useCases();

  const activeCases = useMemo(
    () => cases
      .filter(c => c.status !== 'closed')
      .sort((a, b) => {
        const urgencyOrder = { Urgent: 0, Scheduled: 1, Routine: 2 };
        return (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
      }),
    [cases]
  );

  const pendingDropoffs = useMemo(
    () => cases.filter(c => c.labDropoffIntent && !c.labDropoff),
    [cases]
  );

  const urgentCount = activeCases.filter(c => c.urgency === 'Urgent').length;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.container, styles.loading, { backgroundColor: colors.background }]}>
        <Ionicons name="pulse-outline" size={32} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading cases...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={activeCases}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CaseCard
            case_={item}
            onPress={() => router.push(`/case/${item.id}`)}
          />
        )}
        scrollEnabled={!!activeCases.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: topPad + 16 }]}>
            <View style={styles.headerTop}>
              <View>
                <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                  Good {getGreeting()},
                </Text>
                <Text style={[styles.nurseGreeting, { color: colors.foreground }]}>
                  {profile?.name?.split(' ')[0] ?? 'Nurse'}
                </Text>
              </View>
              <View style={[styles.zonePill, { backgroundColor: colors.secondary }]}>
                <Ionicons name="location-outline" size={13} color={colors.primary} />
                <Text style={[styles.zoneText, { color: colors.primary }]}>
                  {profile?.zone?.split(' ')[0] ?? 'Gurugram'}
                </Text>
              </View>
            </View>

            {urgentCount > 0 && (
              <View style={[styles.urgentBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={[styles.urgentText, { color: '#B91C1C' }]}>
                  {urgentCount} urgent {urgentCount === 1 ? 'case' : 'cases'} require immediate attention
                </Text>
              </View>
            )}

            {pendingDropoffs.length > 0 && (
              <TouchableOpacity 
                style={[styles.dropoffBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                onPress={() => router.push(`/case/${pendingDropoffs[0].id}`)} // Link to the first one for now or a list
              >
                <View style={styles.dropoffIcon}>
                  <Ionicons name="flask" size={18} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropoffTitle, { color: '#15803D' }]}>
                    {pendingDropoffs.length} Lab {pendingDropoffs.length === 1 ? 'Dropoff' : 'Dropoffs'} Pending
                  </Text>
                  <Text style={[styles.dropoffSubtitle, { color: '#166534' }]}>
                    Deliver samples to lab and record dropoff details.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#16A34A" />
              </TouchableOpacity>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Today's Assignments
              </Text>
              <Text style={[styles.caseCount, { color: colors.mutedForeground }]}>
                {activeCases.length} {activeCases.length === 1 ? 'case' : 'cases'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="checkmark-circle-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All clear</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No cases assigned for today. Check back later.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  greeting: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  nurseGreeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    marginTop: 1,
  },
  zonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  zoneText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  urgentText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },
  dropoffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  dropoffIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropoffTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginBottom: 2,
  },
  dropoffSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  caseCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
