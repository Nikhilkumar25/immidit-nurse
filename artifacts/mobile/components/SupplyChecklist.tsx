import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { Supply, SupplyType } from '@/types/case';

interface Props {
  supplies: Supply[];
  onToggle: (id: string, confirmed: boolean) => void;
  disabled?: boolean;
}

const TYPE_ICON: Record<SupplyType, { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  medicine: { name: 'pill', color: '#0284C7' },
  vaccine: { name: 'needle', color: '#7C3AED' },
  device: { name: 'stethoscope', color: '#D97706' },
  consumable: { name: 'medical-bag', color: '#059669' },
};

export function SupplyChecklist({ supplies, onToggle, disabled }: Props) {
  const colors = useColors();
  const confirmed = supplies.filter(s => s.confirmed).length;

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Supply Checklist</Text>
        <Text style={[styles.count, { color: confirmed === supplies.length ? '#16A34A' : colors.primary }]}>
          {confirmed}/{supplies.length}
        </Text>
      </View>

      {supplies.map(s => {
        const icon = TYPE_ICON[s.type] ?? TYPE_ICON.consumable;
        return (
          <TouchableOpacity
            key={s.id}
            style={[
              styles.item,
              {
                backgroundColor: s.confirmed ? '#F0FDF4' : colors.muted,
                borderColor: s.confirmed ? '#BBF7D0' : colors.border,
              },
            ]}
            onPress={async () => {
              if (disabled) return;
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle(s.id, !s.confirmed);
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: icon.color + '18' }]}>
              <MaterialCommunityIcons name={icon.name} size={16} color={icon.color} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemName, { color: colors.foreground }]}>{s.name}</Text>
              <Text style={[styles.itemType, { color: colors.mutedForeground }]}>
                {s.type.charAt(0).toUpperCase() + s.type.slice(1)}
              </Text>
            </View>
            <View style={[
              styles.check,
              { backgroundColor: s.confirmed ? '#16A34A' : colors.border },
            ]}>
              {s.confirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  count: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  itemType: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
