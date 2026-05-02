import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NurseCase, NurseProfile, MockDoctor } from '@/types/case';

const CASES_KEY = '@immidit/cases';
const PROFILE_KEY = '@immidit/profile';
const SEEDED_KEY = '@immidit/seeded_v4';

function makeId(index: number, dateStr: string) {
  return `IMM-${dateStr}-${String(index).padStart(4, '0')}`;
}

const today = new Date();
const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');

const SEED_CASES: NurseCase[] = [
  {
    id: makeId(1, todayStr),
    patientName: 'Rajesh Kumar',
    patientAge: 65,
    patientGender: 'M',
    address: 'A-304, Emaar Palm Drive, Sector 54, Gurugram, Haryana 122003',
    chiefIssue: 'Hypertension follow-up — BP monitoring and medication compliance check',
    urgency: 'Urgent',
    supplies: [
      { id: 's1', name: 'BP Monitor', type: 'device', confirmed: false },
      { id: 's2', name: 'Pulse Oximeter', type: 'device', confirmed: false },
      { id: 's3', name: 'Amlodipine 5mg', type: 'medicine', confirmed: false },
      { id: 's4', name: 'Glucometer Strips', type: 'consumable', confirmed: false },
      { id: 's5', name: 'Consent Forms', type: 'consumable', confirmed: false },
    ],
    isVaccineVisit: false,
    currentPhase: 1,
    status: 'assigned',
    createdAt: new Date().toISOString(),
    pcrCompleted: false,
    procedurePhotos: [],
    samplePhotos: [],
  },
  {
    id: makeId(2, todayStr),
    patientName: 'Priya Sharma',
    patientAge: 28,
    patientGender: 'F',
    address: 'B-12, DLF Magnolias, Sector 42, Gurugram, Haryana 122011',
    chiefIssue: 'Post-natal wound dressing — C-section site dressing change, day 5',
    urgency: 'Scheduled',
    supplies: [
      { id: 's6', name: 'Sterile Dressing Kit', type: 'consumable', confirmed: false },
      { id: 's7', name: 'Betadine Solution', type: 'medicine', confirmed: false },
      { id: 's8', name: 'Surgical Gloves (M)', type: 'consumable', confirmed: false },
      { id: 's9', name: 'Consent Forms', type: 'consumable', confirmed: false },
    ],
    isVaccineVisit: false,
    currentPhase: 1,
    status: 'assigned',
    createdAt: new Date().toISOString(),
    pcrCompleted: false,
    procedurePhotos: [],
    samplePhotos: [],
  },
  {
    id: makeId(3, todayStr),
    patientName: 'Arjun Mehta',
    patientAge: 1,
    patientGender: 'M',
    address: 'C-701, Sobha City, Sector 108, Gurugram, Haryana 122017',
    chiefIssue: 'Routine vaccination — DTwP booster, 14-week schedule',
    urgency: 'Routine',
    supplies: [
      { id: 's10', name: 'DTwP Vaccine', type: 'vaccine', confirmed: false },
      { id: 's11', name: 'Cold Box', type: 'device', confirmed: false },
      { id: 's12', name: 'Syringes 2ml', type: 'consumable', confirmed: false },
      { id: 's13', name: 'Consent Forms', type: 'consumable', confirmed: false },
    ],
    isVaccineVisit: true,
    vaccineDetails: {
      name: 'DTwP (Diphtheria, Tetanus, Pertussis)',
      dose: 'Dose 2',
      scheduleWeek: '14 weeks',
      coldChainRequired: true,
    },
    currentPhase: 1,
    status: 'assigned',
    createdAt: new Date().toISOString(),
    pcrCompleted: false,
    procedurePhotos: [],
    samplePhotos: [],
  },
  // Demo case: already at Phase 5 (Procedure Documentation) — all prior phases completed
  {
    id: makeId(4, todayStr),
    patientName: 'Meera Joshi',
    patientAge: 44,
    patientGender: 'F',
    address: 'F-802, Ireo Grand Arch, Sector 58, Gurugram, Haryana 122011',
    chiefIssue: 'Post-operative dressing change & blood sample collection — cholecystectomy Day 7',
    urgency: 'Scheduled',
    supplies: [
      { id: 'd1', name: 'Sterile Dressing Kit', type: 'consumable', confirmed: true },
      { id: 'd2', name: 'Betadine Solution', type: 'medicine', confirmed: true },
      { id: 'd3', name: 'Vacutainer Set (4 tubes)', type: 'consumable', confirmed: true },
      { id: 'd4', name: 'Surgical Gloves (M)', type: 'consumable', confirmed: true },
      { id: 'd5', name: 'Consent Forms', type: 'consumable', confirmed: true },
    ],
    isVaccineVisit: false,
    status: 'in_progress',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    departureTime: new Date(Date.now() - 75 * 60000).toISOString(),
    arrivalTime: new Date(Date.now() - 55 * 60000).toISOString(),
    gpsCoordinates: { lat: 28.4089, lng: 77.0444 },
    consentFormPhotoUri: 'seed://consent-form-p1',
    deviceReadingPhotoUri: 'seed://device-reading-p1',
    pcrCompleted: true,
    pcrData: {
      contactNumber: '+91 98112 34567',
      emergencyContact: 'Ramesh Joshi (husband) — +91 98112 99001',
      chiefComplaint: 'Post-cholecystectomy wound pain (3/10), mild erythema at incision site, blood draw for LFT & CBC',
      formPage1Uri: 'seed://pcr-page1',
      formPage2Uri: 'seed://pcr-page2',
      visitOutcome: 'completed',
      handoverNotes: 'Patient is alert and cooperative. Wound looks clean overall but slight redness noted. Blood samples collected in 3 vacutainers. Follow up with surgeon if erythema worsens.',
    },
    doctorConsultation: {
      doctorName: 'Dr. Anand Mehta',
      specialty: 'General Physician',
      callDuration: '6 mins',
      instructions: 'Continue current dressing protocol. If redness spreads beyond 2 cm from incision, escalate to surgical team immediately. LFT results expected within 24 hours.',
    },
    currentPhase: 6,
    procedurePhotos: ['seed://procedure-photo-dressing', 'seed://procedure-photo-sample'],
    samplePhotos: ['seed://sample-photo-vacutainer'],
  },
];

const SEED_HISTORY: NurseCase[] = [
  {
    id: makeId(18, yesterdayStr),
    patientName: 'Sunita Verma',
    patientAge: 52,
    patientGender: 'F',
    address: 'D-22, DLF Phase 5, Sector 53, Gurugram',
    chiefIssue: 'Diabetic wound dressing — right foot ulcer management',
    urgency: 'Scheduled',
    supplies: [],
    isVaccineVisit: false,
    currentPhase: 6,
    status: 'closed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    departureTime: new Date(Date.now() - 86400000 + 8 * 3600000).toISOString(),
    arrivalTime: new Date(Date.now() - 86400000 + 8.5 * 3600000).toISOString(),
    closeTime: new Date(Date.now() - 86400000 + 10 * 3600000).toISOString(),
    pcrCompleted: true,
    procedurePhotos: [],
    samplePhotos: [],
    caseOutcome: 'completed',
  },
  {
    id: makeId(17, yesterdayStr),
    patientName: 'Deepak Agarwal',
    patientAge: 71,
    patientGender: 'M',
    address: 'E-501, Unitech Nirvana Country, Sector 50, Gurugram',
    chiefIssue: 'Post-hospitalization vitals monitoring — cardiac event Day 3',
    urgency: 'Urgent',
    supplies: [],
    isVaccineVisit: false,
    currentPhase: 6,
    status: 'closed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    departureTime: new Date(Date.now() - 86400000 + 14 * 3600000).toISOString(),
    arrivalTime: new Date(Date.now() - 86400000 + 14.5 * 3600000).toISOString(),
    closeTime: new Date(Date.now() - 86400000 + 16 * 3600000).toISOString(),
    pcrCompleted: true,
    procedurePhotos: [],
    samplePhotos: [],
    caseOutcome: 'referred',
  },
];

const SEED_PROFILE: NurseProfile = {
  id: 'N-001',
  name: 'Kavita Nair',
  zone: 'Gurugram Sectors 54/56/57',
  phone: '+91 98765 43210',
  casesCompleted: 142,
  joinedDate: '2025-08-01',
};

export const MOCK_DOCTORS: MockDoctor[] = [
  { id: 'D-001', name: 'Dr. Anand Mehta', specialty: 'General Physician', isOnline: true, yearsExp: 14 },
  { id: 'D-002', name: 'Dr. Sunita Rao', specialty: 'Cardiologist', isOnline: true, yearsExp: 18 },
  { id: 'D-003', name: 'Dr. Pradeep Joshi', specialty: 'Paediatrician', isOnline: false, yearsExp: 11 },
  { id: 'D-004', name: 'Dr. Meena Sharma', specialty: 'Gynaecologist', isOnline: true, yearsExp: 9 },
  { id: 'D-005', name: 'Dr. Kiran Patel', specialty: 'General Physician', isOnline: false, yearsExp: 7 },
];

export async function seedIfNeeded(): Promise<void> {
  // No-op for Google Sheets (seeding happens via setupSheets in Code.gs)
}

export async function loadCases(): Promise<NurseCase[]> {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_SHEETS_API_URL;
    if (!apiUrl) {
      console.warn('EXPO_PUBLIC_SHEETS_API_URL is missing. Falling back to local seed data.');
      return [...SEED_CASES, ...SEED_HISTORY];
    }
    const res = await fetch(`${apiUrl}?action=pull`);
    const data = await res.json();
    const cases = (data.cases || []) as NurseCase[];
    return cases.map(c => ({
      ...c,
      supplies: c.supplies || [],
      procedurePhotos: c.procedurePhotos || [],
      samplePhotos: c.samplePhotos || []
    }));
  } catch (error) {
    console.error('Failed to load cases from Sheets API:', error);
    return [...SEED_CASES, ...SEED_HISTORY];
  }
}

export async function saveCases(cases: NurseCase[]): Promise<void> {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_SHEETS_API_URL;
    if (!apiUrl) return;
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveCases', data: cases }),
    });
  } catch (error) {
    console.error('Failed to save cases to Sheets API:', error);
  }
}

export async function loadProfile(): Promise<NurseProfile> {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_SHEETS_API_URL;
    if (!apiUrl) return SEED_PROFILE;
    const res = await fetch(`${apiUrl}?action=pull`);
    const data = await res.json();
    // For now, return the first nurse profile or fallback
    return (data.nurses && data.nurses.length > 0) ? data.nurses[0] : SEED_PROFILE;
  } catch (error) {
    console.error('Failed to load profile from Sheets API:', error);
    return SEED_PROFILE;
  }
}

export function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
