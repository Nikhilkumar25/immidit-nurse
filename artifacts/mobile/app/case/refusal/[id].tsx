import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
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
  const [formPhotoUri, setFormPhotoUri] = useState<string | undefined>();
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
    `I, ${nurseName} (ID: ${nurseId}), attempted to provide the scheduled healthcare service at the above address on ${formatDate(now)} at ${formatTime(now)}. The patient or their authorized representative declined the service for the reason(s) documented above. This refusal has been duly recorded in accordance with immidit nursing protocols.`;

  const toggleReason = async (reason: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      Alert.alert('Select a Reason', 'Please select at least one reason for the patient\'s refusal.');
      return;
    }
    if (selectedReasons.includes('Other (specify below)') && !otherReason.trim()) {
      Alert.alert('Other Reason Required', 'Please specify the other reason for refusal.');
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
              formPhotoUri,
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
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: '#991B1B' }]}>Patient</Text>
              <Text style={[styles.infoValue, { color: '#7F1D1D' }]}>
                {c.patientName}, {c.patientAge}y {c.patientGender}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderTopColor: '#FECACA', borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.infoLabel, { color: '#991B1B' }]}>Visit ID</Text>
              <Text style={[styles.infoValue, { color: '#7F1D1D' }]}>{c.id}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopColor: '#FECACA', borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.infoLabel, { color: '#991B1B' }]}>Date & Time</Text>
              <Text style={[styles.infoValue, { color: '#7F1D1D' }]}>{formatDate(now)} · {formatTime(now)}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopColor: '#FECACA', borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.infoLabel, { color: '#991B1B' }]}>Address</Text>
              <Text style={[styles.infoValue, { color: '#7F1D1D', flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                {c.address}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderTopColor: '#FECACA', borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.infoLabel, { color: '#991B1B' }]}>Nurse</Text>
              <Text style={[styles.infoValue, { color: '#7F1D1D' }]}>{nurseName} · {nurseId}</Text>
            </View>
          </View>

          {/* Reason for Refusal */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Reason for Refusal
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Select all that apply. At least one reason is required.
          </Text>

          <View style={[styles.reasonsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              style={[styles.textInput, { borderColor: '#DC2626', color: colors.foreground, backgroundColor: colors.card }]}
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
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>
            Additional Details
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Any other context, patient statements, or observations.
          </Text>
          <TextInput
            style={[styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            placeholder="e.g. Patient stated they had already visited a hospital this morning..."
            placeholderTextColor={colors.mutedForeground}
            value={additionalDetails}
            onChangeText={setAdditionalDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Nurse Certification */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>
            Nurse Certification
          </Text>
          <View style={[styles.statementBox, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#0284C7" style={{ marginTop: 1 }} />
            <Text style={[styles.statementText, { color: '#0C4A6E' }]}>{nurseStatement}</Text>
          </View>

          {/* Witness */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>
            Witness Name <Text style={[styles.optional, { color: colors.mutedForeground }]}>(Optional)</Text>
          </Text>
          <TextInput
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            placeholder="Full name of any witness present"
            placeholderTextColor={colors.mutedForeground}
            value={witnessName}
            onChangeText={setWitnessName}
          />

          {/* Physical Form Photo */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>
            Photo of Signed Physical Form
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Photograph the patient or caregiver's signed physical refusal form. If no signature was obtained, document the refusal verbally in Additional Details above.
          </Text>
          <PhotoCapture
            label="Physical Refusal Form"
            subtitle="Ensure the patient/caregiver signature is clearly visible."
            uri={formPhotoUri}
            onCapture={setFormPhotoUri}
          />

          {/* Submit */}
          <View style={[styles.warningBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <Ionicons name="warning-outline" size={16} color="#C2410C" />
            <Text style={[styles.warningText, { color: '#9A3412' }]}>
              Submitting this form will permanently seal the case as refused. Ensure all information is accurate before proceeding.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: submitting ? '#9CA3AF' : '#B91C1C' }]}
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
  headerLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  infoLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    minWidth: 80,
  },
  infoValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textAlign: 'right',
  },

  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  optional: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },

  reasonsCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
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
    marginBottom: 4,
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

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
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
