import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CaseContext';
import { VitalsForm } from '@/components/VitalsForm';
import type { PCRData, Vitals, MedicationEntry, ConsumableEntry } from '@/types/case';

const EMPTY_VITALS: Vitals = { bp: '', pr: '', spo2: '', temp: '', rr: '', gcs: '' };

function emptyPCR(c: any): PCRData {
  return {
    contactNumber: '',
    emergencyContact: '',
    hasDiabetes: false,
    hasHypertension: false,
    allergies: '',
    currentMedications: '',
    chiefComplaint: c?.chiefIssue ?? '',
    airway: '',
    breathing: '',
    circulation: '',
    disability: '',
    exposure: '',
    vitals: { ...EMPTY_VITALS },
    nurseObservations: '',
    doctorInstructions: '',
    medicationsAdministered: [],
    consumablesUsed: [],
    sampleType: '',
    sampleTubes: '',
    sampleLabName: '',
    visitOutcome: 'completed',
    handoverNotes: '',
  };
}

function makeId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.muted }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
      <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.primary }} />
    </View>
  );
}

function FieldInput({
  label, value, onChange, placeholder, multiline, keyboardType
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any;
}) {
  const colors = useColors();
  return (
    <View style={[styles.fieldRow, { borderTopColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted },
          multiline && styles.multilineInput,
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ''}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

export default function PCRScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCaseById, savePCR } = useCases();

  const c = getCaseById(id ?? '');
  const [pcr, setPCR] = useState<PCRData>(c?.pcrData ?? emptyPCR(c));

  const update = (field: keyof PCRData, value: any) => {
    setPCR(prev => ({ ...prev, [field]: value }));
  };

  const updateVitals = (v: Vitals) => update('vitals', v);

  const addMedication = () => {
    const entry: MedicationEntry = { id: makeId(), name: '', dosage: '', quantity: '', batchNumber: '' };
    update('medicationsAdministered', [...pcr.medicationsAdministered, entry]);
  };

  const updateMedication = (id: string, field: keyof MedicationEntry, val: string) => {
    update('medicationsAdministered', pcr.medicationsAdministered.map(m =>
      m.id === id ? { ...m, [field]: val } : m
    ));
  };

  const removeMedication = (id: string) => {
    update('medicationsAdministered', pcr.medicationsAdministered.filter(m => m.id !== id));
  };

  const addConsumable = () => {
    const entry: ConsumableEntry = { id: makeId(), name: '', quantity: '' };
    update('consumablesUsed', [...pcr.consumablesUsed, entry]);
  };

  const updateConsumable = (id: string, field: keyof ConsumableEntry, val: string) => {
    update('consumablesUsed', pcr.consumablesUsed.map(c =>
      c.id === id ? { ...c, [field]: val } : c
    ));
  };

  const removeConsumable = (id: string) => {
    update('consumablesUsed', pcr.consumablesUsed.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!pcr.chiefComplaint.trim()) {
      Alert.alert('Required field missing', 'Please enter the chief complaint.');
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    savePCR(id ?? '', pcr);
    router.back();
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>PCR Form</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{c?.patientName ?? ''}</Text>
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
          {/* Demographics */}
          <SectionHeader title="Patient Demographics" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldInput label="Contact Number" value={pcr.contactNumber} onChange={v => update('contactNumber', v)} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
            <FieldInput label="Emergency Contact" value={pcr.emergencyContact} onChange={v => update('emergencyContact', v)} placeholder="Name & number" />
          </View>

          {/* Medical History */}
          <SectionHeader title="Medical History" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ToggleRow label="Diabetes" value={pcr.hasDiabetes} onToggle={v => update('hasDiabetes', v)} />
            <ToggleRow label="Hypertension" value={pcr.hasHypertension} onToggle={v => update('hasHypertension', v)} />
            <FieldInput label="Known Allergies" value={pcr.allergies} onChange={v => update('allergies', v)} placeholder="None / specify" />
            <FieldInput label="Current Medications" value={pcr.currentMedications} onChange={v => update('currentMedications', v)} placeholder="List medications" multiline />
          </View>

          {/* Chief Complaint */}
          <SectionHeader title="Chief Complaint" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldInput label="Chief Complaint" value={pcr.chiefComplaint} onChange={v => update('chiefComplaint', v)} placeholder="Patient's primary complaint" multiline />
          </View>

          {/* ABCDE Survey */}
          <SectionHeader title="ABCDE Survey" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldInput label="Airway" value={pcr.airway} onChange={v => update('airway', v)} placeholder="Patent / Compromised" />
            <FieldInput label="Breathing" value={pcr.breathing} onChange={v => update('breathing', v)} placeholder="Rate, effort, sounds" />
            <FieldInput label="Circulation" value={pcr.circulation} onChange={v => update('circulation', v)} placeholder="Pulse quality, skin" />
            <FieldInput label="Disability / Neuro" value={pcr.disability} onChange={v => update('disability', v)} placeholder="GCS, pupils, orientation" />
            <FieldInput label="Exposure" value={pcr.exposure} onChange={v => update('exposure', v)} placeholder="Visible injuries, rash, edema" />
          </View>

          {/* Vitals */}
          <SectionHeader title="Vitals on Arrival" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
            <VitalsForm vitals={pcr.vitals} onChange={updateVitals} />
          </View>

          {/* Nurse Observations */}
          <SectionHeader title="Nurse Observations & Doctor Instructions" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldInput label="Nurse Observations & Actions" value={pcr.nurseObservations} onChange={v => update('nurseObservations', v)} placeholder="Clinical findings and nursing actions taken" multiline />
            <FieldInput label="Doctor Instructions" value={pcr.doctorInstructions} onChange={v => update('doctorInstructions', v)} placeholder="Filled post-call (if applicable)" multiline />
          </View>

          {/* Medications Administered */}
          <SectionHeader title="Medications Administered" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {pcr.medicationsAdministered.map((med, i) => (
              <View key={med.id} style={[styles.dynamicRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
                <View style={styles.dynamicFields}>
                  <TextInput style={[styles.inlineInput, { borderColor: colors.border, color: colors.foreground, flex: 2 }]} placeholder="Medicine name" placeholderTextColor={colors.mutedForeground} value={med.name} onChangeText={v => updateMedication(med.id, 'name', v)} />
                  <TextInput style={[styles.inlineInput, { borderColor: colors.border, color: colors.foreground, flex: 1 }]} placeholder="Dosage" placeholderTextColor={colors.mutedForeground} value={med.dosage} onChangeText={v => updateMedication(med.id, 'dosage', v)} />
                  <TextInput style={[styles.inlineInput, { borderColor: colors.border, color: colors.foreground, flex: 1 }]} placeholder="Qty" placeholderTextColor={colors.mutedForeground} value={med.quantity} onChangeText={v => updateMedication(med.id, 'quantity', v)} keyboardType="number-pad" />
                </View>
                <TextInput style={[styles.inlineInput, { borderColor: colors.border, color: colors.foreground, marginTop: 6 }]} placeholder="Batch number" placeholderTextColor={colors.mutedForeground} value={med.batchNumber} onChangeText={v => updateMedication(med.id, 'batchNumber', v)} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedication(med.id)}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.addBtn, { borderColor: colors.border }]} onPress={addMedication}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Medication</Text>
            </TouchableOpacity>
          </View>

          {/* Consumables */}
          <SectionHeader title="Consumables Used" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {pcr.consumablesUsed.map((con, i) => (
              <View key={con.id} style={[styles.dynamicRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
                <View style={styles.dynamicFields}>
                  <TextInput style={[styles.inlineInput, { borderColor: colors.border, color: colors.foreground, flex: 3 }]} placeholder="Consumable name" placeholderTextColor={colors.mutedForeground} value={con.name} onChangeText={v => updateConsumable(con.id, 'name', v)} />
                  <TextInput style={[styles.inlineInput, { borderColor: colors.border, color: colors.foreground, flex: 1 }]} placeholder="Qty" placeholderTextColor={colors.mutedForeground} value={con.quantity} onChangeText={v => updateConsumable(con.id, 'quantity', v)} keyboardType="number-pad" />
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeConsumable(con.id)}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.addBtn, { borderColor: colors.border }]} onPress={addConsumable}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Consumable</Text>
            </TouchableOpacity>
          </View>

          {/* Sample Collection */}
          <SectionHeader title="Sample Collection" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldInput label="Sample Type" value={pcr.sampleType} onChange={v => update('sampleType', v)} placeholder="Blood / Urine / Swab / None" />
            <FieldInput label="Tubes / Containers" value={pcr.sampleTubes} onChange={v => update('sampleTubes', v)} placeholder="EDTA, SST, etc." />
            <FieldInput label="Lab Name" value={pcr.sampleLabName} onChange={v => update('sampleLabName', v)} placeholder="Lab name for dropoff" />
          </View>

          {/* Handover */}
          <SectionHeader title="Handover Notes" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldInput label="Handover Notes" value={pcr.handoverNotes} onChange={v => update('handoverNotes', v)} placeholder="Notes for next visit or receiving team" multiline />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  saveBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 0,
  },
  sectionHeaderText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  fieldInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    borderWidth: 0,
    padding: 0,
  },
  multilineInput: {
    minHeight: 60,
    lineHeight: 22,
  },
  dynamicRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  dynamicFields: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  bigSaveBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#fff',
  },
});
