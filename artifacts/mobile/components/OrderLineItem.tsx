import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderLine } from '@/types/case';
import { PhotoCapture } from './PhotoCapture';

interface Props {
  line: OrderLine;
  onUpdate: (status: OrderLine['status'], photo?: string) => void;
  colors: any;
}

export function OrderLineItem({ line, onUpdate, colors }: Props) {
  const isDone = line.status === 'administered' || line.status === 'collected';
  const isRefused = line.status === 'refused' || line.status === 'declined';

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: isDone ? '#F0FDF4' : isRefused ? '#FEF2F2' : colors.muted }]}>
          <Ionicons 
            name={line.icon as any || (line.type === 'lab_test' ? 'flask-outline' : 'medkit-outline')} 
            size={18} 
            color={isDone ? '#16A34A' : isRefused ? '#DC2626' : colors.mutedForeground} 
          />
        </View>
        <View style={styles.content}>
          <Text style={[styles.details, { color: colors.foreground }]}>{line.details}</Text>
          <View style={styles.meta}>
            <Text style={[styles.type, { color: colors.mutedForeground }]}>{line.type.toUpperCase().replace('_', ' ')}</Text>
            {line.tube && (
              <View style={[styles.tubePill, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="beaker-outline" size={10} color="#6B7280" />
                <Text style={styles.tubeText}>{line.tube}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.statusBadge}>
           {isDone && <Ionicons name="checkmark-circle" size={18} color="#16A34A" />}
           {isRefused && <Ionicons name="close-circle" size={18} color="#DC2626" />}
        </View>
      </View>

      {line.status === 'pending' ? (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
            onPress={() => onUpdate(line.type === 'lab_test' ? 'collected' : 'administered')}
          >
            <Text style={[styles.actionText, { color: '#16A34A' }]}>
              {line.type === 'lab_test' ? 'Mark Collected' : 'Mark Administered'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
            onPress={() => onUpdate('refused')}
          >
            <Text style={[styles.actionText, { color: '#DC2626' }]}>Refused</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultArea}>
           {line.instructions && (
             <Text style={[styles.instructions, { color: colors.mutedForeground }]}>
               Instruction: {line.instructions}
             </Text>
           )}
           {line.type === 'lab_test' && (
             <PhotoCapture
               label="Sample Photo"
               subtitle="Photo of the labeled collection tube."
               uri={line.photoUri}
               onCapture={uri => onUpdate(line.status, uri)}
             />
           )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  details: {
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  type: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tubePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  tubeText: {
    fontSize: 10,
    color: '#374151',
    marginLeft: 3,
    fontWeight: '500',
  },
  statusBadge: {
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultArea: {
    padding: 12,
    paddingTop: 0,
  },
  instructions: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
});
