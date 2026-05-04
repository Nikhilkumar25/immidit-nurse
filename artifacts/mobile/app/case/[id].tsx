import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Linking, Image, Alert,
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
import { OrderLineItem } from '@/components/OrderLineItem';
import { VitalsForm } from '@/components/VitalsForm';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { formatTime, formatDate } from '@/utils/storage';
import type { Vitals, PhaseNumber, LabDropoff, Lab } from '@/types/case';

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
    getCaseById, updateCase, markDeparture, markArrival,
    setConsentPhoto, setDeviceReadingPhoto,
    saveDoctorConsult, addProcedurePhoto, addSamplePhoto,
    saveLabDropoff, closeCase, confirmSupply, advancePhase, updateOrderLine,
    setSampleCollectionTime,
  } = useCases();

  const c = getCaseById(id ?? '');
  const [exitVitals, setExitVitals] = useState<Vitals>(c?.exitVitals ?? EMPTY_VITALS);
  const [outcome, setOutcome] = useState<string>(c?.caseOutcome ?? 'completed');
  const [notes, setNotes] = useState(c?.nurseNotes ?? '');
  // Lab dropoff local state
  const [labName, setLabName] = useState(c?.labDropoff?.labName ?? '');
  const [labSampleCount, setLabSampleCount] = useState(c?.labDropoff?.sampleCount ?? '');
  const [labSealNumber, setLabSealNumber] = useState(c?.labDropoff?.sealNumber ?? '');
  const [labSaved, setLabSaved] = useState(!!c?.labDropoff);
  const [labError, setLabError] = useState('');
  // Inline close confirmation (replaces Alert which is blocked in iframes)
  const [closeConfirming, setCloseConfirming] = useState(false);

  if (!c) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Case not found.</Text>
      </View>
    );
  }

  const phase = c.currentPhase;
  const isClosed = c.status === 'closed';
  const isRefused = isClosed && c.caseOutcome === 'refused';

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

  const handleLogLabDropoff = async () => {
    if (!labName.trim()) {
      setLabError('Lab name is required before logging the dropoff.');
      return;
    }
    setLabError('');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dropoff: LabDropoff = {
      labName: labName.trim(),
      dropoffTime: new Date().toISOString(),
      sampleCount: labSampleCount.trim(),
      sealNumber: labSealNumber.trim(),
    };
    saveLabDropoff(c.id, dropoff);
    setLabSaved(true);
  };

  const handleCloseCaseTap = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCloseConfirming(true);
  };

  const handleNotesUpdate = (val: string) => {
    setNotes(val);
    updateCase(c.id, { nurseNotes: val });
  };

  const handleVitalsUpdate = (v: Vitals) => {
    setExitVitals(v);
    updateCase(c.id, { exitVitals: v });
  };

  const handleCloseCaseConfirm = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeCase(c.id, outcome as any, notes, exitVitals);
    setCloseConfirming(false);
    
    // If lab dropoff is required but not yet done, stay on screen. Otherwise, go back.
    if (!c.labDropoffIntent || c.labDropoff) {
      router.back();
    }
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
        <View style={[styles.header, {
          paddingTop: topPad + 10,
          backgroundColor: isRefused ? '#B91C1C' : colors.primary,
        }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerCaseId}>{c.id}</Text>
            <Text style={styles.headerPatient}>{c.patientName}</Text>
          </View>
          {isRefused
            ? <View style={styles.refusedPill}><Text style={styles.refusedPillText}>Refused</Text></View>
            : <UrgencyBadge urgency={c.urgency} small />
          }
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
              <TouchableOpacity 
                style={[styles.navBtn, { backgroundColor: colors.primary + '15' }]}
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`)}
              >
                <Ionicons name="navigate" size={12} color={colors.primary} />
                <Text style={[styles.navBtnText, { color: colors.primary }]}>Navigate</Text>
              </TouchableOpacity>
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

          {/* ── PHASE 1: Assignment Received ── */}
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

          {/* ── PHASE 2: En Route & Arrival ── */}
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

          {/* ── PHASE 3: Consent & Initial Docs ── */}
          <PhaseCard
            phaseNumber={3}
            title="Consent & Initial Docs"
            icon="document-text-outline"
            status={isRefused ? 'completed' : getPhaseStatus(phase, 3)}
            completedAt={isRefused ? c.closeTime : (c.consentFormPhotoUri && c.deviceReadingPhotoUri ? c.arrivalTime : undefined)}
          >
            {/* Refused state */}
            {isRefused && c.refusalData ? (
              <View style={[styles.refusedSummary, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <View style={styles.refusedHeader}>
                  <Ionicons name="close-circle" size={18} color="#DC2626" />
                  <Text style={[styles.refusedTitle, { color: '#B91C1C' }]}>Patient Refused Consent</Text>
                </View>
                <Text style={[styles.refusedReasons, { color: '#7F1D1D' }]}>
                  {c.refusalData.reasons.join('\n')}
                  {c.refusalData.otherReason ? `\n${c.refusalData.otherReason}` : ''}
                </Text>
                {c.refusalData.additionalDetails ? (
                  <Text style={[styles.refusedDetails, { color: '#991B1B' }]}>
                    {c.refusalData.additionalDetails}
                  </Text>
                ) : null}
                <Text style={[styles.refusedMeta, { color: '#9CA3AF' }]}>
                  Submitted {formatTime(c.refusalData.submittedAt)}
                  {c.refusalData.witnessName ? ` · Witness: ${c.refusalData.witnessName}` : ''}
                </Text>
              </View>
            ) : (
              <>
                <PhotoCapture
                  label="Consent Form"
                  subtitle="Photograph the signed patient consent form. Required before proceeding."
                  uri={c.consentFormPhotoUri}
                  onCapture={uri => setConsentPhoto(c.id, uri)}
                  disabled={phase !== 3 && !c.consentFormPhotoUri}
                />
                <PhotoCapture
                  label="Device Readings"
                  subtitle="Photo of BP monitor, glucometer, or other device used — screen must be visible."
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

                {/* Patient Refused Consent option */}
                {phase === 3 && (
                  <View style={[styles.refusalDivider, { borderTopColor: colors.border }]}>
                    <Text style={[styles.refusalDividerText, { color: colors.mutedForeground }]}>
                      — or —
                    </Text>
                    <TouchableOpacity
                      style={[styles.refusalBtn, { borderColor: '#DC2626' }]}
                      onPress={() => router.push(`/case/refusal/${c.id}`)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                      <View style={styles.refusalBtnContent}>
                        <Text style={[styles.refusalBtnTitle, { color: '#B91C1C' }]}>
                          Patient Refused Consent
                        </Text>
                        <Text style={[styles.refusalBtnSub, { color: '#9CA3AF' }]}>
                          Document patient's refusal and seal case
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </PhaseCard>

          {/* ── PHASE 4: PCR + Doctor Connect ── */}
          <PhaseCard
            phaseNumber={4}
            title="PCR Fill & Doctor Connect"
            icon="pulse-outline"
            status={isRefused ? 'locked' : getPhaseStatus(phase, 4)}
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
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
                Doctor Consultation (Optional)
              </Text>
            </View>

            <DoctorConnect
              existing={c.doctorConsultation}
              onCall={() => updateCase(c.id, { consultationRequested: true })}
              onSave={(data) => {
                saveDoctorConsult(c.id, data);
                updateCase(c.id, { consultationRequested: false });
              }}
            />
          </PhaseCard>

          {/* ── PHASE 5: Clinical Order Actionables ── */}
          <PhaseCard
            phaseNumber={5}
            title="Order Actionables"
            icon="list-outline"
            status={isRefused ? 'locked' : getPhaseStatus(phase, 5)}
          >
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Clinical Orders</Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              Execute and document each order from the doctor. Items can be marked as Refused if patient declines specific care.
            </Text>

            {(c.orderLines || []).map((l) => (
              <OrderLineItem
                key={l.id}
                line={l}
                onUpdate={(status, photo) => updateOrderLine(c.id, l.id, status, photo)}
                colors={colors}
              />
            ))}

            <View style={[styles.divider, { borderColor: colors.border, marginTop: 12 }]} />
            
            {phase >= 5 && (
              <View style={{ gap: 10, marginTop: 12 }}>
                <PhotoCapture
                  label="Sample Collection Vials"
                  subtitle="Capture all sample vials collected. (Multiple photos allowed)"
                  uris={c.samplePhotos}
                  onCapture={(uri) => {
                    addSamplePhoto(c.id, uri);
                    if (!c.sampleCollectionTime) {
                      setSampleCollectionTime(c.id, new Date().toISOString());
                    }
                  }}
                  disabled={isClosed}
                />

                <PhotoCapture
                  label="Procedure & Site Photos"
                  subtitle="Dressing change, IV site, or procedure steps."
                  uris={c.procedurePhotos}
                  onCapture={uri => addProcedurePhoto(c.id, uri)}
                  disabled={isClosed}
                />
              </View>
            )}

            {phase === 5 && (c.orderLines || []).every(l => l.status !== 'pending') && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={handleAdvanceProcedure}
              >
                <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Continue to Discharge</Text>
              </TouchableOpacity>
            )}
          </PhaseCard>

          {/* ── PHASE 6: Discharge & Handoff ── */}
          <PhaseCard
            phaseNumber={6}
            title="Discharge & Handoff"
            icon="exit-outline"
            status={isClosed ? 'completed' : (isRefused ? 'locked' : getPhaseStatus(phase, 6))}
            completedAt={c.closeTime}
          >
            {isClosed && !isRefused ? (
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
                  onChange={handleVitalsUpdate}
                  disabled={phase !== 6}
                />

                {/* Visit Outcome */}
                <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 14 }]}>
                  Visit Outcome
                </Text>
                <View style={styles.outcomeRow}>
                  {(['completed', 'referred', 'incomplete'] as const).map(o => (
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

                {/* Handover Notes */}
                <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 14 }]}>
                  Handover Notes
                </Text>
                <TextInput
                  style={[styles.notesInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
                  placeholder="Any notes for the receiving team, next visit instructions..."
                  placeholderTextColor={colors.mutedForeground}
                  value={notes}
                  onChangeText={handleNotesUpdate}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={phase === 6}
                />

                {closeConfirming ? (
                  <View style={[styles.confirmBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <Text style={[styles.confirmText, { color: '#991B1B' }]}>
                      Once closed, this case cannot be edited. Are you sure?
                    </Text>
                    <View style={styles.confirmRow}>
                      <TouchableOpacity
                        style={[styles.confirmCancel, { borderColor: colors.border }]}
                        onPress={() => setCloseConfirming(false)}
                      >
                        <Text style={[styles.confirmCancelText, { color: colors.foreground }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.confirmClose, { backgroundColor: '#B91C1C' }]}
                        onPress={handleCloseCaseConfirm}
                      >
                        <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                        <Text style={styles.confirmCloseText}>Yes, Close Case</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: '#006D77' }]}
                    onPress={handleCloseCaseTap}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                    <Text style={styles.closeBtnText}>Close Case</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </PhaseCard>

          {/* ── PHASE 7: Lab Dropoff (Optional/Conditional) ── */}
          {c.labDropoffIntent && (
            <PhaseCard
              phaseNumber={7}
              title="Lab Dropoff"
              icon="flask-outline"
              status={c.labDropoff ? 'completed' : (isClosed ? 'active' : 'locked')}
              completedAt={c.labDropoff?.dropoffTime}
            >
              {c.labDropoff ? (
                <View style={[styles.labSummary, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.labSummaryText, { color: colors.foreground }]}>
                    Delivered to {c.labDropoff.labName} at {formatTime(c.labDropoff.dropoffTime)}
                  </Text>
                  <Text style={[styles.labSummaryDetail, { color: colors.mutedForeground }]}>
                    Seal: {c.labDropoff.sealNumber} · Count: {c.labDropoff.sampleCount}
                  </Text>
                  {c.labDropoff.photoUri && (
                    <Image source={{ uri: c.labDropoff.photoUri }} style={styles.labReceipt} />
                  )}
                </View>
              ) : (
                <LabDropoffForm
                  onSave={(data) => {
                    saveLabDropoff(c.id, data);
                    router.back();
                  }}
                  colors={colors}
                />
              )}
            </PhaseCard>
          )}

        </ScrollView>
      </View>
    </>
  );
}

function LabDropoffForm({ onSave, colors }: { onSave: (data: any) => void, colors: any }) {
  const { labs } = useCases();
  const [labName, setLabName] = useState('');
  const [sampleCount, setSampleCount] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();

  const activeLabs = labs.filter(l => l.active);

  const handleSave = () => {
    if (!labName || !sampleCount || !photoUri) {
      Alert.alert('Required Fields', 'Please enter Lab Name, Sample Count and take a photo of the receipt.');
      return;
    }
    onSave({
      labName,
      sampleCount,
      sealNumber,
      photoUri,
      dropoffTime: new Date().toISOString(),
    });
  };

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 6, color: colors.foreground }}>Select Laboratory Partner</Text>
        {activeLabs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {activeLabs.map(l => (
              <TouchableOpacity 
                key={l.id}
                onPress={() => {
                  setLabName(l.name);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ 
                  paddingHorizontal: 12, 
                  paddingVertical: 8, 
                  borderRadius: 10, 
                  backgroundColor: labName === l.name ? '#16A34A' : colors.muted,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: labName === l.name ? '#16A34A' : colors.border
                }}
              >
                <Text style={{ 
                  color: labName === l.name ? '#fff' : colors.foreground, 
                  fontSize: 12, 
                  fontFamily: labName === l.name ? 'Inter_700Bold' : 'Inter_500Medium' 
                }}>{l.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={{ fontSize: 11, color: colors.dim, marginBottom: 8, fontStyle: 'italic' }}>No master labs configured by admin.</Text>
        )}
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
          placeholder="Or enter lab name manually..."
          value={labName}
          onChangeText={setLabName}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 4, color: colors.foreground }}>Sample Count</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            placeholder="e.g. 2"
            keyboardType="number-pad"
            value={sampleCount}
            onChangeText={setSampleCount}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 4, color: colors.foreground }}>Seal Number</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            placeholder="Optional"
            value={sealNumber}
            onChangeText={setSealNumber}
          />
        </View>
      </View>
      
      <PhotoCapture
        label="Dropoff Receipt"
        subtitle="Photograph the acknowledgment from the lab."
        uri={photoUri}
        onCapture={setPhotoUri}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: '#16A34A', marginTop: 8 }]}
        onPress={handleSave}
      >
        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Confirm Dropoff</Text>
      </TouchableOpacity>
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
  refusedPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  refusedPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
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
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  navBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
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
    marginBottom: 8,
  },
  infoNoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },

  refusalDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 6,
    gap: 12,
    alignItems: 'center',
  },
  refusalDividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  refusalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    alignSelf: 'stretch',
  },
  refusalBtnContent: { flex: 1 },
  refusalBtnTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  refusalBtnSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 1,
  },

  refusedSummary: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  refusedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refusedTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  refusedReasons: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  refusedDetails: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  refusedMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 4,
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

  labSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
    gap: 10,
  },
  labHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  optionalTag: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  labConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  labConfirmedInfo: { flex: 1 },
  labConfirmedName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  labConfirmedMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  labForm: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
    gap: 10,
  },
  labInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  labRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labInputHalf: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  labLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 2,
  },
  labLogBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#fff',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
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

  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  inlineErrorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },

  confirmBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  confirmText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  confirmClose: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
  },
  confirmCloseText: {
    fontSize: 14,
    color: '#fff',
  },
  labSummary: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  labSummaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  labSummaryDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  labReceipt: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    minHeight: 44,
  },
});
