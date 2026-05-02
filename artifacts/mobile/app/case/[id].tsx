import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CaseContext';
import { PhaseCard } from '@/components/PhaseCard';
import { SupplyChecklist } from '@/components/SupplyChecklist';
import { PhotoCapture } from '@/components/PhotoCapture';
import { DoctorConnect } from '@/components/DoctorConnect';
import { VitalsForm } from '@/components/VitalsForm';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { formatTime } from '@/utils/storage';
import type { Vitals, PhaseNumber } from '@/types/case';

const EMPTY_VITALS: Vitals = { bp: '', pr: '', spo2: '', temp: '', rr: '', gcs: '' };

function getPhaseStatus(casePhase: PhaseNumber, phaseNum: number): 'locked' | 'active' | 'completed' {
  if (phaseNum < casePhase) return 'completed';
  if (phaseNum === casePhase) return 'active';
  return 'locked';
}

export default function CaseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getCaseById, markDeparture, markArrival,
    setConsentPhoto, setDeviceReadingPhoto,
    saveDoctorConsult, addProcedurePhoto, addSamplePhoto,
    saveExitVitals, closeCase, confirmSupply, advancePhase,
  } = useCases();

  const c = getCaseById(id ?? '');
  const [exitVitals, setExitVitals] = useState<Vitals>(c?.exitVitals ?? EMPTY_VITALS);
  const [outcome, setOutcome] = useState<string>(c?.caseOutcome ?? 'completed');
  const [notes, setNotes] = useState(c?.nurseNotes ?? '');
  const [closingCase, setClosingCase] = useState(false);

  if (!c) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Case not found.</Text>
      </View>
    );
  }

  const phase = c.currentPhase;
  const isClosed = c.status === 'closed';

  const handleDeparture = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markDeparture(c.id);
  };

  const handleArrival = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let coords: { lat: number; lng: number } | undefined;
    if (Platform.OS !== 'web') {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      } catch {}
    }
    markArrival(c.id, coords);
  };

  const handleCloseCase = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Close Case',
      'Once closed, this case cannot be edited. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Case',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            closeCase(c.id, outcome as any, notes);
            router.back();
          },
        },
      ]
    );
  };

  const handleAdvanceProcedure = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    advancePhase(c.id, 6);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Custom Header */}
        <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.primary }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerCaseId}>{c.id}</Text>
            <Text style={styles.headerPatient}>{c.patientName}</Text>
          </View>
          <UrgencyBadge urgency={c.urgency} small />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Patient Info Banner */}
          <View style={[styles.patientBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.patientRow}>
              <MaterialCommunityIcons name="account-circle" size={40} color={colors.primary} />
              <View style={styles.patientInfo}>
                <Text style={[styles.patientName, { color: colors.foreground }]}>{c.patientName}</Text>
                <Text style={[styles.patientMeta, { color: colors.mutedForeground }]}>
                  {c.patientAge}y · {c.patientGender} · {c.urgency}
                </Text>
              </View>
            </View>
            <Text style={[styles.chiefIssue, { color: colors.foreground }]}>{c.chiefIssue}</Text>
            <View style={[styles.addressRow, { borderTopColor: colors.border }]}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.addressText, { color: colors.mutedForeground }]}>{c.address}</Text>
            </View>
            {c.isVaccineVisit && c.vaccineDetails && (
              <View style={[styles.vaccineRow, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                <MaterialCommunityIcons name="needle" size={14} color="#7C3AED" />
                <Text style={[styles.vaccineText, { color: '#7C3AED' }]}>
                  {c.vaccineDetails.name} · {c.vaccineDetails.dose} · Week {c.vaccineDetails.scheduleWeek}
                  {c.vaccineDetails.coldChainRequired ? ' · Cold chain required' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Phase 1: Assignment Received */}
          <PhaseCard
            phaseNumber={1}
            title="Assignment Received"
            icon="clipboard-outline"
            status={getPhaseStatus(phase, 1)}
            completedAt={c.createdAt}
          >
            <SupplyChecklist
              supplies={c.supplies}
              onToggle={(sid, confirmed) => confirmSupply(c.id, sid, confirmed)}
              disabled={phase > 1}
            />
            {phase === 1 && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleDeparture}
              >
                <Ionicons name="navigate-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Heading Out</Text>
              </TouchableOpacity>
            )}
          </PhaseCard>

          {/* Phase 2: En Route & Arrival */}
          <PhaseCard
            phaseNumber={2}
            title="En Route & Arrival"
            icon="navigate-outline"
            status={getPhaseStatus(phase, 2)}
            completedAt={c.arrivalTime}
          >
            {c.departureTime && (
              <View style={styles.timestampRow}>
                <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.timestampText, { color: colors.mutedForeground }]}>
                  Departed at {formatTime(c.departureTime)}
                </Text>
              </View>
            )}
            {phase === 2 && (
              <>
                <View style={[styles.enRouteInfo, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Ionicons name="navigate" size={14} color="#2563EB" />
                  <Text style={[styles.enRouteText, { color: '#1D4ED8' }]}>{c.address}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#16A34A' }]}
                  onPress={handleArrival}
                >
                  <Ionicons name="location" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>I've Arrived</Text>
                </TouchableOpacity>
              </>
            )}
            {phase > 2 && c.arrivalTime && (
              <View style={styles.timestampRow}>
                <Ionicons name="location" size={14} color="#16A34A" />
                <Text style={[styles.timestampText, { color: '#16A34A' }]}>
                  Arrived at {formatTime(c.arrivalTime)}
                  {c.gpsCoordinates ? ' · GPS logged' : ''}
                </Text>
              </View>
            )}
          </PhaseCard>

          {/* Phase 3: Consent & Initial Docs */}
          <PhaseCard
            phaseNumber={3}
            title="Consent & Initial Docs"
            icon="document-text-outline"
            status={getPhaseStatus(phase, 3)}
            completedAt={c.consentFormPhotoUri && c.deviceReadingPhotoUri ? c.arrivalTime : undefined}
          >
            <PhotoCapture
              label="Consent Form"
              subtitle="Take a photo of the signed consent form. This is required before proceeding."
              uri={c.consentFormPhotoUri}
              onCapture={uri => setConsentPhoto(c.id, uri)}
              disabled={phase !== 3 && !c.consentFormPhotoUri}
            />
            <PhotoCapture
              label="Device Readings"
              subtitle="Photo of BP machine, glucometer, or other device used (screen visible)."
              uri={c.deviceReadingPhotoUri}
              onCapture={uri => setDeviceReadingPhoto(c.id, uri)}
              disabled={phase !== 3 && !c.deviceReadingPhotoUri}
            />
            {phase === 3 && !(c.consentFormPhotoUri && c.deviceReadingPhotoUri) && (
              <View style={[styles.infoNote, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoNoteText, { color: colors.mutedForeground }]}>
                  Both photos are required to advance to Phase 4.
                </Text>
              </View>
            )}
          </PhaseCard>

          {/* Phase 4: PCR + Doctor Connect */}
          <PhaseCard
            phaseNumber={4}
            title="PCR Fill & Doctor Connect"
            icon="pulse-outline"
            status={getPhaseStatus(phase, 4)}
            completedAt={c.pcrCompleted ? c.arrivalTime : undefined}
          >
            <TouchableOpacity
              style={[
                styles.pcrBtn,
                {
                  backgroundColor: c.pcrCompleted ? '#F0FDF4' : colors.primary,
                  borderColor: c.pcrCompleted ? '#BBF7D0' : colors.primary,
                },
              ]}
              onPress={() => router.push(`/case/pcr/${c.id}`)}
            >
              <Ionicons
                name={c.pcrCompleted ? 'checkmark-circle' : 'document-text-outline'}
                size={20}
                color={c.pcrCompleted ? '#16A34A' : '#fff'}
              />
              <Text style={[styles.pcrBtnText, { color: c.pcrCompleted ? '#16A34A' : '#fff' }]}>
                {c.pcrCompleted ? 'PCR Completed — Tap to Review' : 'Open PCR Form'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={c.pcrCompleted ? '#16A34A' : '#fff'}
              />
            </TouchableOpacity>

            <View style={[styles.divider, { borderColor: colors.border }]}>
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>Doctor Consultation (Optional)</Text>
            </View>

            <DoctorConnect
              existing={c.doctorConsultation}
              onSave={data => saveDoctorConsult(c.id, data)}
            />
          </PhaseCard>

          {/* Phase 5: Procedure Documentation */}
          <PhaseCard
            phaseNumber={5}
            title="Procedure Documentation"
            icon="camera-outline"
            status={getPhaseStatus(phase, 5)}
          >
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Procedure Photos</Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              Capture consumables opened, dressing/vaccination/IV in progress, and sample collection.
            </Text>

            {c.procedurePhotos.map((uri, i) => (
              <PhotoCapture
                key={i}
                label={`Procedure Photo ${i + 1}`}
                uri={uri}
                onCapture={() => {}}
                disabled
              />
            ))}

            {phase === 5 && (
              <PhotoCapture
                label={`Add Procedure Photo ${c.procedurePhotos.length + 1}`}
                subtitle="Consumables, dressing, vaccination, IV, or sample collection."
                onCapture={uri => addProcedurePhoto(c.id, uri)}
              />
            )}

            <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 8 }]}>Sample Photos</Text>
            {c.samplePhotos.map((uri, i) => (
              <PhotoCapture
                key={`sample-${i}`}
                label={`Sample Photo ${i + 1}`}
                uri={uri}
                onCapture={() => {}}
                disabled
              />
            ))}
            {phase === 5 && (
              <PhotoCapture
                label="Add Sample Photo"
                subtitle="Sample tube with label visible."
                onCapture={uri => addSamplePhoto(c.id, uri)}
              />
            )}

            {phase === 5 && c.procedurePhotos.length > 0 && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
                onPress={handleAdvanceProcedure}
              >
                <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Continue to Discharge</Text>
              </TouchableOpacity>
            )}
          </PhaseCard>

          {/* Phase 6: Discharge & Handoff */}
          <PhaseCard
            phaseNumber={6}
            title="Discharge & Handoff"
            icon="exit-outline"
            status={isClosed ? 'completed' : getPhaseStatus(phase, 6)}
            completedAt={c.closeTime}
          >
            {isClosed ? (
              <View style={[styles.closedBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Ionicons name="lock-closed" size={16} color="#16A34A" />
                <Text style={[styles.closedText, { color: '#15803D' }]}>
                  Case sealed at {formatTime(c.closeTime)} · Outcome: {c.caseOutcome}
                </Text>
              </View>
            ) : (
              <>
                <VitalsForm
                  title="Exit Vitals"
                  vitals={exitVitals}
                  onChange={setExitVitals}
                  disabled={phase !== 6}
                />

                <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 14 }]}>Visit Outcome</Text>
                <View style={styles.outcomeRow}>
                  {(['completed', 'referred', 'refused', 'incomplete'] as const).map(o => (
                    <TouchableOpacity
                      key={o}
                      style={[
                        styles.outcomeChip,
                        {
                          backgroundColor: outcome === o ? colors.primary : colors.muted,
                          borderColor: outcome === o ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setOutcome(o)}
                      disabled={phase !== 6}
                    >
                      <Text style={[styles.outcomeText, { color: outcome === o ? '#fff' : colors.foreground }]}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 12 }]}>Handover Notes</Text>
                <TextInput
                  style={[styles.notesInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
                  placeholder="Any notes for the receiving team..."
                  placeholderTextColor={colors.mutedForeground}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={phase === 6}
                />

                {phase === 6 && (
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: '#DC2626' }]}
                    onPress={handleCloseCase}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                    <Text style={styles.closeBtnText}>Close Case</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </PhaseCard>
        </ScrollView>
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
  headerCaseId: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },
  headerPatient: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#fff',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  patientBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientInfo: { flex: 1 },
  patientName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  patientMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 1,
  },
  chiefIssue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addressText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  vaccineText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  timestampText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  enRouteInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  enRouteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  infoNoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  pcrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  pcrBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    flex: 1,
  },
  divider: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginBottom: 12,
  },
  dividerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  outcomeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  outcomeChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  outcomeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    minHeight: 90,
    marginTop: 6,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  closeBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  closedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },
});
