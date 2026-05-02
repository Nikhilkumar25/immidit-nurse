import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { UrgencyBadge } from './UrgencyBadge';
import type { NurseCase } from '@/types/case';
import { formatTime } from '@/utils/storage';

interface Props {
  case_: NurseCase;
  onPress: () => void;
}

const PHASE_LABELS = ['Assignment', 'En Route', 'Consent & Docs', 'PCR & Doctor', 'Procedure', 'Discharge'];

const STATUS_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  assigned: { icon: 'time-outline', color: '#6B7280', label: 'Assigned' },
  en_route: { icon: 'navigate-outline', color: '#0284C7', label: 'En Route' },
  arrived: { icon: 'location-outline', color: '#7C3AED', label: 'Arrived' },
  in_progress: { icon: 'pulse-outline', color: '#D97706', label: 'In Progress' },
  closed: { icon: 'checkmark-circle-outline', color: '#16A34A', label: 'Closed' },
};

export function CaseCard({ case_: c, onPress }: Props) {
  const colors = useColors();
  const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.assigned;
  const phaseLabel = PHASE_LABELS[(c.currentPhase ?? 1) - 1] ?? 'Assignment';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.caseId, { color: colors.mutedForeground }]}>{c.id}</Text>
          <UrgencyBadge urgency={c.urgency} />
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '18' }]}>
          <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
          <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.patientName, { color: colors.foreground }]}>{c.patientName}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {c.patientAge}y · {c.patientGender} · {c.chiefIssue.length > 60 ? c.chiefIssue.slice(0, 58) + '…' : c.chiefIssue}
        </Text>
      </View>

      <View style={[styles.addressRow, { borderTopColor: colors.border }]}>
        <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
        <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
          {c.address}
        </Text>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.phaseRow}>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <View
              key={n}
              style={[
                styles.phaseDot,
                {
                  backgroundColor:
                    n < c.currentPhase
                      ? '#16A34A'
                      : n === c.currentPhase
                      ? colors.primary
                      : colors.border,
                  width: n === c.currentPhase ? 18 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.phaseLabel, { color: colors.primary }]}>
          Phase {c.currentPhase}: {phaseLabel}
        </Text>
        {c.arrivalTime && (
          <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
            Arrived {formatTime(c.arrivalTime)}
          </Text>
        )}
      </View>

      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caseId: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 3,
  },
  patientName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  meta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  address: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    flexWrap: 'wrap',
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  phaseDot: {
    height: 8,
    borderRadius: 4,
  },
  phaseLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  timeLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginLeft: 'auto',
  },
  chevron: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -9,
  },
});
