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

export interface ABCDESurvey {
  airway: 'Clear' | 'Obstructed' | 'Partial';
  breathing: 'Normal' | 'Distressed' | 'Rapid' | 'Slow';
  circulation: 'Normal' | 'Weak' | 'Absent';
  disability: 'Alert' | 'Voice' | 'Pain' | 'Unresponsive';
  exposure: string;
}

/**
 * PCRData — captures full clinical flow.
 */
export interface PCRData {
  contactNumber: string;
  emergencyContact: string;
  chiefComplaint: string;
  abcde?: ABCDESurvey;
  consumablesUsed?: string;
  medicationsGiven?: string;
  formPage1Uri?: string;
  formPage2Uri?: string;
  // Optional previous records
  prevPrescriptionUri?: string;
  prevMedicinePhotoUri?: string;
  visitOutcome: CaseOutcome;
  handoverNotes: string;
}

export interface DoctorConsultation {
  doctorName: string;
  specialty: string;
  callDuration: string;
  instructions: string;
  voiceRecordingUri?: string;
}

export interface LabDropoff {
  labName: string;
  dropoffTime: string;
  sampleCount: string;
  sealNumber: string;
  photoUri?: string;
}

export interface RefusalData {
  reasons: string[];
  otherReason: string;
  additionalDetails: string;
  witnessName: string;
  formPage1Uri?: string;
  formPage2Uri?: string;
  nurseStatement: string;
  submittedAt: string;
}

export type OrderLineType = 'procedure' | 'lab_test' | 'diagnostic_test' | 'medication' | 'referral';
export type OrderLineStatus = 'pending' | 'administered' | 'collected' | 'accepted' | 'refused' | 'declined';

export interface OrderLine {
  id: string;
  type: OrderLineType;
  details: string;
  instructions?: string;
  tube?: string;
  status: OrderLineStatus;
  updatedAt: string;
  photoUri?: string;
  icon?: string;
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
  pcrCompletedTime?: string;
  doctorConsultTime?: string;
  closeTime?: string;
  gpsCoordinates?: { lat: number; lng: number };
  consentFormPhotoUri?: string;
  deviceReadingPhotoUri?: string;
  pcrCompleted: boolean;
  pcrData?: PCRData;
  consultationRequested?: boolean;
  sampleCollectionTime?: string;
  labDropoffIntent?: boolean;
  linkedPrescriptionId?: string;
  doctorConsultation?: DoctorConsultation;
  procedurePhotos: string[];
  samplePhotos: string[];
  exitVitals?: Vitals;
  labDropoff?: LabDropoff;
  refusalData?: RefusalData;
  lastUpdatedLocation?: { lat: number; lng: number; timestamp: string };
  caseOutcome?: CaseOutcome;
  nurseNotes?: string;
  orderLines: OrderLine[];
  updatedAt: string;
}

export interface NurseProfile {
  id: string;
  name: string;
  zone: string;
  phone: string;
  casesCompleted: number;
  joinedDate: string;
  password?: string;
}

export interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  isOnline: boolean;
  experience: string;
  phone?: string;
  qualification?: string;
  regId?: string;
}

export interface Lab {
  id: string;
  name: string;
  address: string;
  active: boolean;
}
