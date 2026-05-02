export type Urgency = 'Urgent' | 'Scheduled' | 'Routine';
export type CaseStatus = 'assigned' | 'en_route' | 'arrived' | 'in_progress' | 'closed';
export type CaseOutcome = 'completed' | 'referred' | 'refused' | 'incomplete';
export type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type Gender = 'M' | 'F' | 'Other';
export type SupplyType = 'medicine' | 'vaccine' | 'device' | 'consumable';

export interface Vitals {
  bp: string;
  pr: string;
  spo2: string;
  temp: string;
  rr: string;
  gcs: string;
}

export interface Supply {
  id: string;
  name: string;
  type: SupplyType;
  confirmed: boolean;
}

export interface VaccineDetails {
  name: string;
  dose: string;
  scheduleWeek: string;
  coldChainRequired: boolean;
}

export interface PCRData {
  contactNumber: string;
  emergencyContact: string;
  hasDiabetes: boolean;
  hasHypertension: boolean;
  allergies: string;
  currentMedications: string;
  chiefComplaint: string;
  airway: string;
  breathing: string;
  circulation: string;
  disability: string;
  exposure: string;
  vitals: Vitals;
  nurseObservations: string;
  doctorInstructions: string;
  medicationsAdministered: MedicationEntry[];
  consumablesUsed: ConsumableEntry[];
  sampleType: string;
  sampleTubes: string;
  sampleLabName: string;
  visitOutcome: CaseOutcome;
  handoverNotes: string;
}

export interface MedicationEntry {
  id: string;
  name: string;
  dosage: string;
  quantity: string;
  batchNumber: string;
}

export interface ConsumableEntry {
  id: string;
  name: string;
  quantity: string;
}

export interface DoctorConsultation {
  doctorName: string;
  specialty: string;
  callDuration: string;
  instructions: string;
}

export interface LabDropoff {
  labName: string;
  dropoffTime: string;
}

export interface NurseCase {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: Gender;
  address: string;
  chiefIssue: string;
  urgency: Urgency;
  supplies: Supply[];
  isVaccineVisit: boolean;
  vaccineDetails?: VaccineDetails;
  currentPhase: PhaseNumber;
  status: CaseStatus;
  createdAt: string;
  departureTime?: string;
  arrivalTime?: string;
  closeTime?: string;
  gpsCoordinates?: { lat: number; lng: number };
  consentFormPhotoUri?: string;
  deviceReadingPhotoUri?: string;
  pcrCompleted: boolean;
  pcrData?: PCRData;
  doctorConsultation?: DoctorConsultation;
  procedurePhotos: string[];
  samplePhotos: string[];
  exitVitals?: Vitals;
  labDropoff?: LabDropoff;
  caseOutcome?: CaseOutcome;
  nurseNotes?: string;
}

export interface NurseProfile {
  id: string;
  name: string;
  zone: string;
  phone: string;
  casesCompleted: number;
  joinedDate: string;
}

export interface MockDoctor {
  id: string;
  name: string;
  specialty: string;
  isOnline: boolean;
  yearsExp: number;
}
