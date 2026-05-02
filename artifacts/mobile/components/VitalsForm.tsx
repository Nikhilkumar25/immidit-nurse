import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Vitals } from '@/types/case';

interface Props {
  vitals: Vitals;
  onChange: (updated: Vitals) => void;
  disabled?: boolean;
  title?: string;
}

const FIELDS: { key: keyof Vitals; label: string; unit: string; placeholder: string }[] = [
  { key: 'bp', label: 'Blood Pressure', unit: 'mmHg', placeholder: '120/80' },
  { key: 'pr', label: 'Pulse Rate', unit: 'bpm', placeholder: '72' },
  { key: 'spo2', label: 'SpO2', unit: '%', placeholder: '98' },
  { key: 'temp', label: 'Temperature', unit: '°F', placeholder: '98.6' },
  { key: 'rr', label: 'Resp. Rate', unit: '/min', placeholder: '16' },
  { key: 'gcs', label: 'GCS', unit: '/15', placeholder: '15' },
];

export function VitalsForm({ vitals, onChange, disabled, title }: Props) {
  const colors = useColors();

  const update = (key: keyof Vitals, val: string) => {
    onChange({ ...vitals, [key]: val });
  };

  return (
    <View>
      {title && (
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      )}
      <View style={[styles.grid, { borderColor: colors.border }]}>
        {FIELDS.map((f, i) => (
          <View
            key={f.key}
            style={[
              styles.cell,
              {
                borderColor: colors.border,
                borderRightWidth: i % 2 === 0 ? 1 : 0,
                borderBottomWidth: i < FIELDS.length - 2 ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.cellLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.cellInput, { color: colors.foreground }]}
                value={vitals[f.key]}
                onChangeText={v => update(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.mutedForeground}
                keyboardType={f.key === 'bp' ? 'default' : 'decimal-pad'}
                editable={!disabled}
              />
              <Text style={[styles.unit, { color: colors.mutedForeground }]}>{f.unit}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cell: {
    width: '50%',
    padding: 12,
  },
  cellLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  cellInput: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    flex: 1,
    padding: 0,
  },
  unit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
});
