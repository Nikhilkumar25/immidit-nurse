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
import { formatDate, formatTime } from '@/utils/storage';

const REFUSAL_REASONS = [
  'Patient not at home / unavailable',
  'Patient declined treatment or procedure',
  "Patient's caregiver or family member declined",
  'Patient requested to reschedule',
  'Medical reason — patient unable to consent',
  'Patient stated service not required',
  'Language or communication barrier',
  'Other (specify below)',
];

export default function RefusalFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCaseById, refuseCase, profile } = useCases();

  const c = getCaseById(id ?? '');

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [formPage1Uri, setFormPage1Uri] = useState<string | undefined>();
  const [formPage2Uri, setFormPage2Uri] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  if (!c) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Case not found.</Text>
      </View>
    );
  }

  const now = new Date().toISOString();
  const nurseName = profile?.name ?? 'Nurse';
  const nurseId = profile?.id ?? 'N-001';
  const nurseStatement =
    `I, ${nurseName} (ID: ${nurseId}), attempted to provide the scheduled healthcare service at the above address on ${formatDate(now)} at ${formatTime(now)}. The patient or their authorised representative declined the service for the reason(s) documented above. This refusal has been duly recorded in accordance with immidit nursing protocols.`;

  const toggleReason = async (reason: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      Alert.alert('Select a Reason', 'Please select at least one reason for the refusal.');
      return;
    }
    if (selectedReasons.includes('Other (specify below)') && !otherReason.trim()) {
      Alert.alert('Other Reason Required', 'Please specify the other reason for refusal.');
      return;
    }
    if (!formPage1Uri || !formPage2Uri) {
      Alert.alert(
        'Both Pages Required',
        'Please photograph both pages of the signed physical refusal form before submitting.',
      );
      return;
    }

    Alert.alert(
      'Submit Refusal Form',
      'This will seal the case as "Patient Refused". This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit & Close Case',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            refuseCase(c.id, {
              reasons: selectedReasons,
              otherReason,
              additionalDetails,
              witnessName,
              formPage1Uri,
              formPage2Uri,
              nurseStatement,
              submittedAt: new Date().toISOString(),
            });
            router.dismissAll();
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const hasOther = selectedReasons.includes('Other (specify below)');
  const bothPhotos = !!formPage1Uri && !!formPage2Uri;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: '#B91C1C' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerLabel}>Refusal of Healthcare Services</Text>
            <Text style={styles.headerSub}>{c.patientName} · {c.id}</Text>
          </View>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 60 }]}
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
        >

          {/* Case info block */}
          <View style={[styles.infoCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <InfoRow label="Patient" value={`${c.patientName}, ${c.patientAge}y ${c.patientGender}`} />
            <InfoRow label="Visit ID" value={c.id} />
            <InfoRow label="Date & Time" value={`${formatDate(now)} · ${formatTime(now)}`} />
            <InfoRow label="Address" value={c.address} multiline />
            <InfoRow label="Nurse" value={`${nurseName} · ${nurseId}`} last />
          </View>

          {/* Reasons */}
          <SectionLabel label="Reason for Refusal" hint="Select all that apply. At least one is required." colors={colors} />

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {REFUSAL_REASONS.map((reason, i) => {
              const checked = selectedReasons.includes(reason);
              return (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonRow,
                    {
                      borderTopColor: colors.border,
                      borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
                    },
                  ]}
                  onPress={() => toggleReason(reason)}
                  activeOpacity={0.75}
                >
                  <View style={[
                    styles.checkbox,
                    {
                      backgroundColor: checked ? '#DC2626' : colors.muted,
                      borderColor: checked ? '#DC2626' : colors.border,
                    },
                  ]}>
                    {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.reasonText, { color: colors.foreground }]}>{reason}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {hasOther && (
            <TextInput
              style={[styles.textInput, {
                marginHorizontal: 20, marginTop: 8,
                borderColor: '#DC2626', color: colors.foreground, backgroundColor: colors.card,
              }]}
              placeholder="Specify the other reason..."
              placeholderTextColor={colors.mutedForeground}
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}

          {/* Additional Details */}
          <SectionLabel label="Additional Details" hint="Any context, patient statements, or observations." colors={colors} />
          <TextInput
            style={[styles.textArea, {
              marginHorizontal: 20,
              borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card,
            }]}
            placeholder="e.g. Patient stated they had already visited a hospital this morning..."
            placeholderTextColor={colors.mutedForeground}
            value={additionalDetails}
            onChangeText={setAdditionalDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Nurse Certification */}
          <SectionLabel label="Nurse Certification" hint="Auto-generated from your profile and current time." colors={colors} />
          <View style={[styles.statementBox, { marginHorizontal: 20, backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#0284C7" style={{ marginTop: 1, flexShrink: 0 }} />
            <Text style={[styles.statementText, { color: '#0C4A6E' }]}>{nurseStatement}</Text>
          </View>

          {/* Witness */}
          <SectionLabel
            label="Witness Name"
            hint="Optional — full name of any witness present."
            colors={colors}
          />
          <TextInput
            style={[styles.textInput, {
              marginHorizontal: 20,
              borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card,
            }]}
            placeholder="Witness full name"
            placeholderTextColor={colors.mutedForeground}
            value={witnessName}
            onChangeText={setWitnessName}
          />

          {/* Physical Form Photos — 2 pages */}
          <SectionLabel
            label="Physical Refusal Form — Photos"
            hint="Photograph both pages of the signed physical refusal form. Patient or caregiver signature must be clearly visible."
            colors={colors}
          />

          <View style={[styles.instructionBox, { marginHorizontal: 20, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Ionicons name="camera-outline" size={15} color="#2563EB" />
            <Text style={[styles.instructionText, { color: '#1E40AF' }]}>
              Capture the full page in frame. Ensure handwriting and the patient signature are legible. No gallery uploads — use camera only.
            </Text>
          </View>

          <View style={{ marginHorizontal: 20, marginTop: 12 }}>
            <PhotoCapture
              label="Page 1 of 2"
              subtitle="Patient details, reason checkboxes, initial statement."
              uri={formPage1Uri}
              onCapture={setFormPage1Uri}
            />
            <PhotoCapture
              label="Page 2 of 2"
              subtitle="Nurse certification, witness section, patient/caregiver signature."
              uri={formPage2Uri}
              onCapture={setFormPage2Uri}
            />
          </View>

          {/* Photo status banner */}
          <View style={[
            styles.statusBanner,
            {
              marginHorizontal: 20,
              backgroundColor: bothPhotos ? '#F0FDF4' : '#FFF7ED',
              borderColor: bothPhotos ? '#BBF7D0' : '#FED7AA',
            },
          ]}>
            <Ionicons
              name={bothPhotos ? 'checkmark-circle' : 'alert-circle-outline'}
              size={16}
              color={bothPhotos ? '#16A34A' : '#C2410C'}
            />
            <Text style={[styles.statusText, { color: bothPhotos ? '#15803D' : '#9A3412' }]}>
              {bothPhotos
                ? 'Both pages captured — ready to submit.'
                : `${!formPage1Uri ? 'Page 1' : 'Page 2'} photo still needed.`}
            </Text>
          </View>

          {/* Warning */}
          <View style={[styles.warningBox, { marginHorizontal: 20, backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <Ionicons name="warning-outline" size={16} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
            <Text style={[styles.warningText, { color: '#9A3412' }]}>
              Submitting this form permanently seals the case as refused. Ensure all information is accurate before proceeding.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, {
              marginHorizontal: 20,
              backgroundColor: submitting ? '#9CA3AF' : '#B91C1C',
            }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Refusal & Seal Case</Text>
          </TouchableOpacity>

        </KeyboardAwareScrollView>
      </View>
    </>
  );
}

function SectionLabel({ label, hint, colors }: { label: string; hint?: string; colors: any }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 }}>
      <Text style={[sectionStyles.title, { color: colors.foreground }]}>{label}</Text>
      {hint && <Text style={[sectionStyles.hint, { color: colors.mutedForeground }]}>{hint}</Text>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  title: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
});

function InfoRow({ label, value, multiline, last }: { label: string; value: string; multiline?: boolean; last?: boolean }) {
  return (
    <View style={[infoStyles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, multiline && { maxWidth: 220, textAlign: 'right' }]} numberOfLines={multiline ? 2 : 1}>
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FECACA',
    gap: 12,
  },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#991B1B', minWidth: 80 },
  value: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#7F1D1D', flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: 'Inter_500Medium', fontSize: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerContent: { flex: 1 },
  headerLabel: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  scroll: { paddingBottom: 40 },

  infoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reasonText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    minHeight: 100,
  },

  statementBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  statementText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  instructionBox: {
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

  statusBanner: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  warningText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 8,
  },
  submitBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
});
