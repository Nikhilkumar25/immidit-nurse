import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CaseContext';
import { formatDate, formatTime } from '@/utils/storage';
import type { NurseCase } from '@/types/case';

const OUTCOME_CONFIG = {
  completed: { color: '#16A34A', bg: '#F0FDF4', label: 'Completed' },
  referred: { color: '#D97706', bg: '#FEF3C7', label: 'Referred' },
  refused: { color: '#DC2626', bg: '#FEE2E2', label: 'Refused' },
  incomplete: { color: '#6B7280', bg: '#F3F4F6', label: 'Incomplete' },
};

function HistoryItem({ item }: { item: NurseCase }) {
  const colors = useColors();
  const outcome = item.caseOutcome ?? 'completed';
  const cfg = OUTCOME_CONFIG[outcome] ?? OUTCOME_CONFIG.completed;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.caseId, { color: colors.mutedForeground }]}>{item.id}</Text>
          <Text style={[styles.patientName, { color: colors.foreground }]}>{item.patientName}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {item.patientAge}y · {item.patientGender} · {item.chiefIssue.slice(0, 55)}{item.chiefIssue.length > 55 ? '…' : ''}
          </Text>
        </View>
        <View style={[styles.outcomeBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.outcomeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.arrivalTime && (
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Arrived {formatTime(item.arrivalTime)}
            </Text>
          </View>
        )}
        {item.closeTime && (
          <View style={styles.footerItem}>
            <Ionicons name="checkmark-circle-outline" size={13} color="#16A34A" />
            <Text style={[styles.footerText, { color: '#16A34A' }]}>
              Closed {formatTime(item.closeTime)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cases } = useCases();

  const history = useMemo(
    () => cases.filter(c => c.status === 'closed').sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [cases]
  );

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Case History</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {history.length} completed {history.length === 1 ? 'case' : 'cases'}
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <HistoryItem item={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        scrollEnabled={!!history.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="archive-outline" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No completed cases</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Closed cases will appear here after you complete your first visit.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    gap: 10,
  },
  caseId: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginBottom: 2,
  },
  patientName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginBottom: 2,
  },
  meta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 220,
  },
  outcomeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  outcomeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
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
    fontSize: 18,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
