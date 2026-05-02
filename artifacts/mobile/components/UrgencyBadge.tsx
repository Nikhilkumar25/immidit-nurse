import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Urgency } from '@/types/case';

interface Props {
  urgency: Urgency;
  small?: boolean;
}

export function UrgencyBadge({ urgency, small }: Props) {
  const colors = useColors();

  const config = {
    Urgent: { bg: '#FEE2E2', text: '#B91C1C', dot: '#DC2626' },
    Scheduled: { bg: '#E0F2FE', text: '#0369A1', dot: '#0284C7' },
    Routine: { bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' },
  };

  const c = config[urgency];
  const fontSize = small ? 10 : 11;
  const px = small ? 6 : 8;
  const py = small ? 2 : 3;
  const dotSize = small ? 5 : 6;

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, paddingHorizontal: px, paddingVertical: py }]}>
      <View style={[styles.dot, { backgroundColor: c.dot, width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
      <Text style={[styles.label, { color: c.text, fontSize }]}>{urgency}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    gap: 4,
  },
  dot: {},
  label: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
