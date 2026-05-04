import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CaseContext';
import { PhotoCapture } from '@/components/PhotoCapture';
import { formatDate } from '@/utils/storage';
import type { PCRData, CaseOutcome } from '@/types/case';

function emptyPCR(chiefIssue: string): PCRData {
  return {
    contactNumber: '',
    chiefComplaint: chiefIssue,
    abcde: {
      airway: 'Clear',
      breathing: 'Normal',
      circulation: 'Normal',
      disability: 'Alert',
      exposure: '',
    },
    visitOutcome: 'completed',
    handoverNotes: '',
  };
}

export default function PCRScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCaseById, updateCase, savePCR } = useCases();

  const c = getCaseById(id ?? '');
  const [pcr, setPCR] = useState<PCRData>(c?.pcrData ?? emptyPCR(c?.chiefIssue ?? ''));

  // Atomic Sync: Save each step completion to the cloud instantly
  const update = <K extends keyof PCRData>(field: K, value: PCRData[K]) => {
    const nextPCR = { ...pcr, [field]: value };
    setPCR(nextPCR);
    
    // Immediate Push for step-level persistence
    // We don't mark pcrCompleted: true until the final save
    updateCase(id ?? '', { pcrData: nextPCR });
  };

  const handleSave = async () => {
    if (!pcr.chiefComplaint.trim()) {
      Alert.alert('Chief Complaint Required', 'Please enter the chief complaint before saving.');
      return;
    }
    if (!pcr.formPage1Uri || !pcr.formPage2Uri) {
      Alert.alert(
        'Both Pages Required',
        'Please photograph both pages of the physical PCR form before saving.',
      );
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Mark as completed and advance phase
    savePCR(id ?? '', pcr);
    router.back();
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (!c) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Case not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[styles.header, {
          paddingTop: topPad + 10,
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>PCR Form</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {c.patientName} · {c.id}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
        >

          {/* Patient summary — read-only */}
          <View style={[styles.patientCard, { backgroundColor: colors.secondary, borderColor: colors.primary + '30' }]}>
            <View style={styles.patientRow}>
              <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.patientName, { color: colors.primary }]}>{c.patientName}</Text>
              <Text style={[styles.patientMeta, { color: colors.primary + 'AA' }]}>
                {c.patientAge}y · {c.patientGender}
              </Text>
            </View>
            <Text style={[styles.patientIssue, { color: colors.primary + 'CC' }]} numberOfLines={2}>
              {c.chiefIssue}
            </Text>
            <Text style={[styles.patientDate, { color: colors.mutedForeground }]}>
              {formatDate(c.createdAt)} · {c.address.split(',')[0]}
            </Text>
          </View>

          {/* Section: Basic Details */}
          <SectionHeader label="Basic Patient Details" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldRow
              label="Chief Complaint"
              value={pcr.chiefComplaint}
              onChange={v => update('chiefComplaint', v)}
              placeholder="Patient's primary complaint"
              multiline
              colors={colors}
              first
            />
          </View>

          {/* Section: ABCDE Assessment */}
          <SectionHeader label="ABCDE Assessment" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ABCDEGroup
              label="Airway"
              value={pcr.abcde?.airway ?? 'Clear'}
              options={['Clear', 'Partial', 'Obstructed']}
              onSelect={v => update('abcde', { ...pcr.abcde!, airway: v as any })}
              colors={colors}
              first
            />
            <ABCDEGroup
              label="Breathing"
              value={pcr.abcde?.breathing ?? 'Normal'}
              options={['Normal', 'Distressed', 'Rapid', 'Slow']}
              onSelect={v => update('abcde', { ...pcr.abcde!, breathing: v as any })}
              colors={colors}
            />
            <ABCDEGroup
              label="Circulation"
              value={pcr.abcde?.circulation ?? 'Normal'}
              options={['Normal', 'Weak', 'Absent']}
              onSelect={v => update('abcde', { ...pcr.abcde!, circulation: v as any })}
              colors={colors}
            />
            <ABCDEGroup
              label="Disability"
              value={pcr.abcde?.disability ?? 'Alert'}
              options={['Alert', 'Voice', 'Pain', 'Unresponsive']}
              onSelect={v => update('abcde', { ...pcr.abcde!, disability: v as any })}
              colors={colors}
            />
            <FieldRow
              label="Exposure / Skin"
              value={pcr.abcde?.exposure ?? ''}
              onChange={v => update('abcde', { ...pcr.abcde!, exposure: v })}
              placeholder="Temp, skin findings, wounds..."
              colors={colors}
            />
          </View>

          {/* Section: Interventions */}
          <SectionHeader label="Clinical Interventions" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldRow
              label="Interventions"
              value={pcr.handoverNotes ?? ''}
              onChange={v => update('handoverNotes', v)}
              placeholder="e.g. PCM 650mg, IV Cannula (20G) used..."
              multiline
              colors={colors}
              first
            />
          </View>

          {/* Section: External Records (Optional) */}
          <SectionHeader label="Previous Records (Optional)" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 12, marginBottom: 16 }]}>
            <PhotoCapture
              label="Previous Prescription"
              subtitle="Photo of old prescription / hospital discharge papers"
              uri={pcr.prevPrescriptionUri}
              onCapture={v => update('prevPrescriptionUri', v)}
            />
            <View style={{ height: 12 }} />
            <PhotoCapture
              label="Previous Medications"
              subtitle="Photo of currently used medicine strips / bottles"
              uri={pcr.prevMedicinePhotoUri}
              onCapture={v => update('prevMedicinePhotoUri', v)}
            />
          </View>

          {/* Section: Physical Form Photos */}
          <SectionHeader label="Physical PCR Form — Photos" colors={colors} />
          <View style={[styles.instructionBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Ionicons name="camera-outline" size={16} color="#2563EB" />
            <Text style={[styles.instructionText, { color: '#1E40AF' }]}>
              Photograph both pages of the completed physical PCR form. Ensure all handwritten entries are clearly legible and the full page is captured within frame.
            </Text>
          </View>

          <View style={styles.photosSection}>
            <PhotoCapture
              label="Page 1 of 2"
              subtitle="Patient demographics, medical history, chief complaint, ABCDE survey, vitals."
              uri={pcr.formPage1Uri}
              onCapture={uri => update('formPage1Uri', uri)}
            />
            <PhotoCapture
              label="Page 2 of 2"
              subtitle="Nurse observations, medications administered, consumables, sample details, handover."
              uri={pcr.formPage2Uri}
              onCapture={uri => update('formPage2Uri', uri)}
            />
          </View>

          {/* Section: Handover notes */}
          <SectionHeader label="Digital Handover Notes" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.fieldBlock, { borderTopWidth: 0 }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Outcome</Text>
              <View style={styles.outcomeRow}>
                {(['completed', 'referred', 'incomplete'] as CaseOutcome[]).map(o => (
                  <TouchableOpacity
                    key={o}
                    style={[
                      styles.outcomeChip,
                      {
                        backgroundColor: pcr.visitOutcome === o ? colors.primary : colors.muted,
                        borderColor: pcr.visitOutcome === o ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => update('visitOutcome', o)}
                  >
                    <Text style={[styles.outcomeText, { color: pcr.visitOutcome === o ? '#fff' : colors.foreground }]}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={[styles.fieldBlock, { borderTopColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes for next team</Text>
              <TextInput
                style={[styles.textArea, { color: colors.foreground }]}
                placeholder="Next visit instructions, pending tests, flags for receiving team..."
                placeholderTextColor={colors.mutedForeground}
                value={pcr.handoverNotes}
                onChangeText={v => update('handoverNotes', v)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Photo completion status */}
          <View style={[
            styles.completionBanner,
            {
              backgroundColor: (pcr.formPage1Uri && pcr.formPage2Uri) ? '#F0FDF4' : '#FFF7ED',
              borderColor: (pcr.formPage1Uri && pcr.formPage2Uri) ? '#BBF7D0' : '#FED7AA',
            },
          ]}>
            <Ionicons
              name={(pcr.formPage1Uri && pcr.formPage2Uri) ? 'checkmark-circle' : 'alert-circle-outline'}
              size={16}
              color={(pcr.formPage1Uri && pcr.formPage2Uri) ? '#16A34A' : '#C2410C'}
            />
            <Text style={[
              styles.completionText,
              { color: (pcr.formPage1Uri && pcr.formPage2Uri) ? '#15803D' : '#9A3412' },
            ]}>
              {pcr.formPage1Uri && pcr.formPage2Uri
                ? 'Both pages photographed — ready to save.'
                : `${!pcr.formPage1Uri ? 'Page 1' : 'Page 2'} photo still needed.`}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.bigSaveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.bigSaveBtnText}>Save PCR & Continue</Text>
          </TouchableOpacity>

        </KeyboardAwareScrollView>
      </View>
    </>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[sectionStyles.header, { color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
});

function FieldRow({
  label, value, onChange, placeholder, multiline, keyboardType, colors, first,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  colors: any;
  first?: boolean;
}) {
  return (
    <View style={[
      styles.fieldBlock,
      { borderTopColor: colors.border, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth },
    ]}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground }, multiline && styles.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ''}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function ABCDEGroup({
  label, value, options, onSelect, colors, first,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  colors: any;
  first?: boolean;
}) {
  return (
    <View style={[
      styles.fieldBlock,
      { borderTopColor: colors.border, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth },
    ]}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>{label}</Text>
      <View style={styles.outcomeRow}>
        {options.map(o => (
          <TouchableOpacity
            key={o}
            style={[
              styles.outcomeChip,
              {
                backgroundColor: value === o ? colors.primary : colors.muted,
                borderColor: value === o ? colors.primary : colors.border,
                flex: 1,
              },
            ]}
            onPress={() => onSelect(o)}
          >
            <Text
              style={[
                styles.outcomeText,
                { color: value === o ? '#fff' : colors.foreground, fontSize: 11 },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {o}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: 'Inter_500Medium', fontSize: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  saveBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
  },

  scroll: {
    paddingBottom: 40,
  },

  patientCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 5,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  patientMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  patientIssue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  patientDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fieldBlock: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    padding: 0,
    minHeight: 24,
  },
  multiline: {
    minHeight: 60,
    lineHeight: 22,
  },

  instructionBox: {
    marginHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  photosSection: {
    marginHorizontal: 20,
    marginTop: 12,
    gap: 0,
  },

  outcomeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  outcomeChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  outcomeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  textArea: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    padding: 0,
  },

  completionBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },

  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 16,
  },
  bigSaveBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#fff',
  },
});
