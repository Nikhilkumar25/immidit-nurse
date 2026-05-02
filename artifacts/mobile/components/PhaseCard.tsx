import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { formatTime } from '@/utils/storage';

interface Props {
  phaseNumber: number;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: 'locked' | 'active' | 'completed';
  completedAt?: string;
  children?: React.ReactNode;
}

export function PhaseCard({ phaseNumber, title, icon, status, completedAt, children }: Props) {
  const colors = useColors();

  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  const iconColor = isCompleted ? '#16A34A' : isActive ? colors.primary : colors.border;
  const headerBg = isCompleted ? '#F0FDF4' : isActive ? colors.primary + '10' : colors.muted;
  const borderColor = isCompleted ? '#BBF7D0' : isActive ? colors.primary + '40' : colors.border;
  const numberBg = isCompleted ? '#16A34A' : isActive ? colors.primary : colors.border;

  return (
    <View style={[styles.card, { borderColor, backgroundColor: colors.card }]}>
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.number, { backgroundColor: numberBg }]}>
            {isCompleted ? (
              <Ionicons name="checkmark" size={13} color="#fff" />
            ) : (
              <Text style={styles.numberText}>{phaseNumber}</Text>
            )}
          </View>
          <Ionicons name={icon} size={18} color={iconColor} />
          <Text style={[
            styles.title,
            { color: isLocked ? colors.mutedForeground : colors.foreground }
          ]}>
            {title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isLocked && <Ionicons name="lock-closed-outline" size={14} color={colors.border} />}
          {isCompleted && completedAt && (
            <Text style={[styles.timeLabel, { color: '#15803D' }]}>{formatTime(completedAt)}</Text>
          )}
          {isActive && (
            <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
              <Text style={styles.activePillText}>Active</Text>
            </View>
          )}
        </View>
      </View>

      {isActive && children && (
        <View style={[styles.body, { borderTopColor: colors.border }]}>
          {children}
        </View>
      )}

      {isCompleted && children && (
        <View style={[styles.body, { borderTopColor: '#BBF7D0' }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  number: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#fff',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  activePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#fff',
  },
  body: {
    padding: 14,
    borderTopWidth: 1,
  },
});
