import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CaseContext';
import { createMeetLink } from '@/utils/storage';
import type { DoctorConsultation, DoctorProfile } from '@/types/case';

interface Props {
  caseId: string;
  existing?: DoctorConsultation;
  onSave: (data: DoctorConsultation) => void;
  onCall?: (doctorName: string) => void;
}

const SPECIALTIES = ['General Physician', 'Cardiologist', 'Paediatrician', 'Gynaecologist'];

export function DoctorConnect({ caseId, existing, onSave, onCall }: Props) {
  const colors = useColors();
  const { doctors } = useCases();
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [calling, setCalling] = useState(false);
  const [calledDoctor, setCalledDoctor] = useState<string | null>(existing?.doctorName ?? null);
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [callDuration, setCallDuration] = useState(existing?.callDuration ?? '');
  const [saved, setSaved] = useState(!!existing);

  const filteredDoctors = doctors.filter(
    d => !selectedSpecialty || d.specialty === selectedSpecialty
  );

  const handleCall = async (doctorName: string, specialty: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setCalling(true);
      setCalledDoctor(doctorName);
      
      const meetUrl = await createMeetLink(caseId);
      await Linking.openURL(meetUrl);
      
      setCalling(false);
      if (onCall) onCall(doctorName);
    } catch (err: any) {
      setCalling(false);
      Alert.alert('Call Failed', err.message || 'Could not connect to the doctor.');
    }
  };

  const handleSave = async () => {
    if (!calledDoctor) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const specialty = doctors.find(d => d.name === calledDoctor)?.specialty ?? '';
    onSave({ doctorName: calledDoctor, specialty, callDuration, instructions });
    setSaved(true);
  };

  if (saved && existing) {
    return (
      <View style={[styles.savedCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
        <View style={styles.savedInfo}>
          <Text style={[styles.savedName, { color: colors.foreground }]}>{existing.doctorName}</Text>
          <Text style={[styles.savedMeta, { color: colors.mutedForeground }]}>
            {existing.specialty} · {existing.callDuration} min
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.specialtyRow}>
        {SPECIALTIES.map(s => (
          <TouchableOpacity
            key={s}
            style={[
              styles.specialtyChip,
              {
                backgroundColor: selectedSpecialty === s ? colors.primary : colors.muted,
                borderColor: selectedSpecialty === s ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedSpecialty(prev => prev === s ? '' : s)}
          >
            <Text style={[
              styles.specialtyText,
              { color: selectedSpecialty === s ? '#fff' : colors.foreground },
            ]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.doctorList}>
        {filteredDoctors.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>No doctors found in this specialty.</Text>
          </View>
        ) : filteredDoctors.map(doc => (
          <View
            key={doc.id}
            style={[styles.doctorRow, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: doc.isOnline ? colors.primary + '20' : colors.border }]}>
              <MaterialCommunityIcons name="doctor" size={20} color={doc.isOnline ? colors.primary : colors.mutedForeground} />
            </View>
            <View style={styles.docInfo}>
              <View style={styles.docNameRow}>
                <Text style={[styles.docName, { color: colors.foreground }]}>{doc.name}</Text>
                <View style={[styles.onlineDot, { backgroundColor: doc.isOnline ? '#16A34A' : '#9CA3AF' }]} />
              </View>
              <Text style={[styles.docMeta, { color: colors.mutedForeground }]}>
                {doc.specialty} · {doc.experience}y exp
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.callBtn,
                { backgroundColor: doc.isOnline ? colors.primary : colors.border },
              ]}
              onPress={() => doc.isOnline && handleCall(doc.name, doc.specialty)}
              disabled={!doc.isOnline || calling}
            >
              <Ionicons name="call" size={14} color={doc.isOnline ? '#fff' : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {calledDoctor && (
        <View style={[styles.logSection, { borderColor: colors.border }]}>
          <Text style={[styles.logTitle, { color: colors.foreground }]}>Log Consultation</Text>
          <Text style={[styles.logDoctor, { color: colors.primary }]}>{calledDoctor}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            placeholder="Call duration (minutes)"
            placeholderTextColor={colors.mutedForeground}
            value={callDuration}
            onChangeText={setCallDuration}
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            placeholder="Doctor's instructions, diagnosis, medications prescribed..."
            placeholderTextColor={colors.mutedForeground}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Save Consultation</Text>
          </TouchableOpacity>
        </View>
      )}

      {!calledDoctor && (
        <TouchableOpacity style={[styles.fallbackBtn, { borderColor: colors.border }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>
            No doctors available — Request On-Call
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  specialtyChip: {
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  specialtyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  doctorList: {
    gap: 8,
    marginBottom: 16,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  docMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  logTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  logDoctor: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    minHeight: 80,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingVertical: 12,
  },
  fallbackText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  savedInfo: { flex: 1 },
  savedName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  savedMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
});
