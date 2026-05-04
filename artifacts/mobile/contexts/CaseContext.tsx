import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import type {
  NurseCase, NurseProfile, PCRData, DoctorConsultation,
  Vitals, LabDropoff, PhaseNumber, RefusalData, DoctorProfile,
  OrderLineStatus, Lab,
} from '@/types/case';
import * as Location from 'expo-location';
import { loadCases, saveCases, loadProfile, uploadMedia } from '@/utils/storage';

interface CaseContextValue {
  cases: NurseCase[];
  profile: NurseProfile | null;
  doctors: DoctorProfile[];
  labs: Lab[];
  loading: boolean;
  getCaseById: (id: string) => NurseCase | undefined;
  updateCase: (id: string, updates: Partial<NurseCase>) => void;
  markDeparture: (id: string) => void;
  markArrival: (id: string, coords?: { lat: number; lng: number }) => void;
  setConsentPhoto: (id: string, uri: string) => void;
  setDeviceReadingPhoto: (id: string, uri: string) => void;
  savePCR: (id: string, data: PCRData) => void;
  saveDoctorConsult: (id: string, data: DoctorConsultation) => void;
  addProcedurePhoto: (id: string, uri: string) => void;
  addSamplePhoto: (id: string, uri: string) => void;
  saveExitVitals: (id: string, vitals: Vitals) => void;
  saveLabDropoff: (id: string, dropoff: LabDropoff) => void;
  closeCase: (id: string, outcome: NurseCase['caseOutcome'], notes: string, exitVitals?: Vitals) => void;
  refuseCase: (id: string, data: RefusalData) => void;
  setSampleCollectionTime: (id: string, time: string) => void;
  confirmSupply: (caseId: string, supplyId: string, confirmed: boolean) => void;
  updateOrderLine: (caseId: string, lineId: string, status: OrderLineStatus, photoUri?: string) => void;
  advancePhase: (id: string, phase: PhaseNumber) => void;
  login: (nurseId: string, passcode: string) => Promise<boolean>;
  logout: () => void;
  refreshCases: () => Promise<void>;
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [allCases, setAllCases] = useState<NurseCase[]>([]);
  const [profile, setProfile] = useState<NurseProfile | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const notifiedCaseIds = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const isSyncing = useRef(false);

  const refreshCases = useCallback(async () => {
    if (isSyncing.current) return;
    try {
      const { loadCases: fetchCases, loadDoctors: fetchDoctors, loadLabs: fetchLabs } = await import('@/utils/storage');
      const [cloudCases, d, l] = await Promise.all([fetchCases(), fetchDoctors(), fetchLabs()]);
      
      setLabs(l);
      setAllCases(prev => {
        // Atomic Merging: Use all unique IDs to ensure we capture both local updates and new cloud assignments
        const allIds = Array.from(new Set([...prev.map(c => c.id), ...cloudCases.map(c => c.id)]));
        
        const merged = allIds.map(id => {
          const local = prev.find(c => c.id === id);
          const cloud = cloudCases.find(c => c.id === id);
          
          if (!local) return cloud!; // New assignment from cloud
          if (!cloud) return local;  // Local case not yet in cloud

          const localTime = new Date(local.updatedAt || 0).getTime();
          const cloudTime = new Date(cloud.updatedAt || 0).getTime();

          // CRITICAL: Only accept cloud data if it is STRICTLY newer than our local/disk state.
          // This prevents "lagging cloud" data from overwriting recent nurse entries.
          return cloudTime > localTime ? cloud : local;
        });

        const sanitized = sanitizeCases(merged, false);

        // Optimization: Avoid state trigger if nothing changed
        if (JSON.stringify(prev) === JSON.stringify(sanitized)) return prev;
        return sanitized;
      });
      
      setDoctors(prev => {
        if (JSON.stringify(prev) === JSON.stringify(d)) return prev;
        return d;
      });
    } catch (e) {
      console.warn('Sync refresh failed:', e);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { loadCases: fetchCases, loadProfile: fetchProfile, loadDoctors: fetchDoctors, loadLabs: fetchLabs } = await import('@/utils/storage');
      const [c, p, d, l] = await Promise.all([fetchCases(), fetchProfile(), fetchDoctors(), fetchLabs()]);
      
      setLabs(l);
      // Sanitize cases: If we are on web, and we have blob URIs from a different origin, clear them
      // This happens when the dev port changes (e.g. 8082 -> 3001)
      const sanitized = sanitizeCases(c, true);
      
      // Seed notified IDs so we don't alert for existing cases on first load
      sanitized.forEach(cs => notifiedCaseIds.current.add(cs.id));
      
      setAllCases(sanitized);
      setProfile(p);
      setDoctors(d);
      setLoading(false);
    }
    init();

    const interval = setInterval(() => {
      const isEditing = pathname.includes('/pcr/') || pathname.includes('/vitals/');
      if (!isEditing) refreshCases();
    }, 20000);

    return () => clearInterval(interval);
  }, [refreshCases, pathname]);

  useEffect(() => {
    // Only alert for 'assigned' cases that haven't been notified before
    const newlyAssigned = cases.filter(c => c.status === 'assigned' && !notifiedCaseIds.current.has(c.id));
    
    if (newlyAssigned.length > 0) {
      newlyAssigned.forEach(c => notifiedCaseIds.current.add(c.id));
      
      if (Platform.OS !== 'web') {
        const { Alert } = require('react-native');
        Alert.alert(
          "New Assignment",
          `You have been assigned a new case for ${newlyAssigned[0].patientName}.`,
          [{ text: "View Cases" }]
        );
      } else {
        console.log("New Case Assigned (Web):", newlyAssigned[0].id);
      }
    }
  }, [cases]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('GPS tracking failed:', e);
    }
    return null;
  };

  const updateCase = useCallback(async (id: string, updates: Partial<NurseCase>) => {
    isSyncing.current = true;
    try {
      const locUpdate = await getCurrentLocation();
      
      setAllCases(prev => {
        const now = new Date().toISOString();
        const next = prev.map(c => c.id === id ? { 
          ...c, 
          ...updates, 
          lastUpdatedLocation: locUpdate || c.lastUpdatedLocation,
          updatedAt: now 
        } : c);
        
        import('@/utils/storage').then(m => m.saveCases(next).finally(() => {
          isSyncing.current = false;
        }));
        return next;
      });
    } catch (e) {
      isSyncing.current = false;
      console.error("Update failed:", e);
    }
  }, []);

  const loginUser = useCallback(async (nurseId: string, passcode: string) => {
    const { login: doLogin } = await import('@/utils/storage');
    const p = await doLogin(nurseId, passcode);
    if (p) {
      setProfile(p);
      return true;
    }
    return false;
  }, []);

  const logoutUser = useCallback(async () => {
    const { clearProfile } = await import('@/utils/storage');
    await clearProfile();
    setProfile(null);
  }, []);

  const cases = React.useMemo(() => {
    if (!profile) return [];
    return allCases.filter(c => (c as any).assignedNurseId === profile.id);
  }, [allCases, profile]);

  const getCaseById = useCallback((id: string) => {
    return cases.find(c => c.id === id);
  }, [cases]);

  const markDeparture = useCallback((id: string) => {
    updateCase(id, { departureTime: new Date().toISOString(), status: 'en_route', currentPhase: 2 });
  }, [updateCase]);

  const markArrival = useCallback((id: string, coords?: { lat: number; lng: number }) => {
    updateCase(id, { arrivalTime: new Date().toISOString(), status: 'arrived', currentPhase: 3, gpsCoordinates: coords });
  }, [updateCase]);

  const setConsentPhoto = useCallback(async (id: string, uri: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    
    // 1. Instant local update
    const updates: Partial<NurseCase> = { consentFormPhotoUri: uri };
    if (!!c.deviceReadingPhotoUri) { updates.currentPhase = 4; updates.status = 'in_progress'; }
    await updateCase(id, updates);

    // 2. Background cloud upload
    import('@/utils/storage').then(async m => {
      const cloudUrl = await m.uploadMedia(uri, `consent_${id}.jpg`, 'image/jpeg');
      updateCase(id, { consentFormPhotoUri: cloudUrl });
    });
  }, [cases, updateCase]);

  const setDeviceReadingPhoto = useCallback(async (id: string, uri: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;

    const updates: Partial<NurseCase> = { deviceReadingPhotoUri: uri };
    if (!!c.consentFormPhotoUri) { updates.currentPhase = 4; updates.status = 'in_progress'; }
    await updateCase(id, updates);

    import('@/utils/storage').then(async m => {
      const cloudUrl = await m.uploadMedia(uri, `reading_${id}.jpg`, 'image/jpeg');
      updateCase(id, { deviceReadingPhotoUri: cloudUrl });
    });
  }, [cases, updateCase]);

  const savePCR = useCallback((id: string, data: PCRData) => {
    updateCase(id, { pcrCompleted: true, pcrData: data, pcrCompletedTime: new Date().toISOString(), currentPhase: 5 });
    
    // Background upload PCR photos if they are local
    import('@/utils/storage').then(async m => {
      const uploads: Partial<PCRData> = {};
      if (data.formPage1Uri?.startsWith('file://') || data.formPage1Uri?.startsWith('blob:')) {
        uploads.formPage1Uri = await m.uploadMedia(data.formPage1Uri, `pcr1_${id}.jpg`, 'image/jpeg');
      }
      if (data.formPage2Uri?.startsWith('file://') || data.formPage2Uri?.startsWith('blob:')) {
        uploads.formPage2Uri = await m.uploadMedia(data.formPage2Uri, `pcr2_${id}.jpg`, 'image/jpeg');
      }
      if (data.prevPrescriptionUri?.startsWith('file://')) {
        uploads.prevPrescriptionUri = await m.uploadMedia(data.prevPrescriptionUri, `prev_rx_${id}.jpg`, 'image/jpeg');
      }
      if (data.prevMedicinePhotoUri?.startsWith('file://')) {
        uploads.prevMedicinePhotoUri = await m.uploadMedia(data.prevMedicinePhotoUri, `prev_med_${id}.jpg`, 'image/jpeg');
      }
      if (Object.keys(uploads).length > 0) {
        updateCase(id, { pcrData: { ...data, ...uploads } });
      }
    });
  }, [updateCase]);

  const saveDoctorConsult = useCallback((id: string, data: DoctorConsultation) => {
    updateCase(id, { doctorConsultation: data, doctorConsultTime: new Date().toISOString() });
    
    // Background upload voice recording
    if (data.voiceRecordingUri?.startsWith('file://') || data.voiceRecordingUri?.startsWith('blob:')) {
      import('@/utils/storage').then(async m => {
        const cloudUrl = await m.uploadMedia(data.voiceRecordingUri!, `voice_${id}.m4a`, 'audio/m4a');
        updateCase(id, { doctorConsultation: { ...data, voiceRecordingUri: cloudUrl } });
      });
    }
  }, [updateCase]);

  const addProcedurePhoto = useCallback(async (id: string, uri: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    
    const newPhotos = [...c.procedurePhotos, uri];
    await updateCase(id, { procedurePhotos: newPhotos });

    import('@/utils/storage').then(async m => {
      try {
        const cloudUrl = await m.uploadMedia(uri, `proc_${id}_${Date.now()}.jpg`, 'image/jpeg');
        // Retrieve current state to ensure we don't overwrite other photos added during upload
        setAllCases(prev => {
          const target = prev.find(item => item.id === id);
          if (!target) return prev;
          
          const updatedPhotos = target.procedurePhotos.map(p => p === uri ? cloudUrl : p);
          const next = prev.map(item => item.id === id ? { ...item, procedurePhotos: updatedPhotos } : item);
          
          // CRITICAL: Push the cloud URL to the sheet immediately
          m.saveCases(next);
          return next;
        });
      } catch (e) {
        console.error("Procedure photo upload failed:", e);
      }
    });
  }, [updateCase]);

  const addSamplePhoto = useCallback(async (id: string, uri: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    
    const newPhotos = [...(c.samplePhotos || []), uri];
    await updateCase(id, { samplePhotos: newPhotos });

    import('@/utils/storage').then(async m => {
      try {
        const cloudUrl = await m.uploadMedia(uri, `sample_${id}_${Date.now()}.jpg`, 'image/jpeg');
        setAllCases(prev => {
          const target = prev.find(item => item.id === id);
          if (!target) return prev;
          const updatedPhotos = target.samplePhotos.map(p => p === uri ? cloudUrl : p);
          const next = prev.map(item => item.id === id ? { ...item, samplePhotos: updatedPhotos } : item);
          m.saveCases(next);
          return next;
        });
      } catch (e) {
        console.error("Sample photo upload failed:", e);
      }
    });
  }, [updateCase]);

  const saveExitVitals = useCallback((id: string, vitals: Vitals) => {
    updateCase(id, { exitVitals: vitals });
  }, [updateCase]);

  const saveLabDropoff = useCallback((id: string, dropoff: LabDropoff) => {
    updateCase(id, { labDropoff: dropoff });
  }, [updateCase]);

  const closeCase = useCallback((id: string, outcome: NurseCase['caseOutcome'], notes: string, exitVitals?: Vitals) => {
    updateCase(id, { closeTime: new Date().toISOString(), status: 'closed', currentPhase: 6, caseOutcome: outcome, nurseNotes: notes, ...(exitVitals ? { exitVitals } : {}) });
  }, [updateCase]);

  const refuseCase = useCallback((id: string, data: RefusalData) => {
    updateCase(id, { refusalData: data, closeTime: new Date().toISOString(), status: 'closed', caseOutcome: 'refused' });
  }, [updateCase]);

  const confirmSupply = useCallback(async (caseId: string, supplyId: string, confirmed: boolean) => {
    const locUpdate = await getCurrentLocation();
    setAllCases(prev => {
      const now = new Date().toISOString();
      const next = prev.map(c => {
        if (c.id !== caseId) return c;
        return { 
          ...c, 
          updatedAt: now, 
          lastUpdatedLocation: locUpdate || c.lastUpdatedLocation,
          supplies: c.supplies.map(s => s.id === supplyId ? { ...s, confirmed } : s) 
        };
      });
      saveCases(next);
      return next;
    });
  }, []);

  const updateOrderLine = useCallback(async (caseId: string, lineId: string, status: OrderLineStatus, photoUri?: string) => {
    const locUpdate = await getCurrentLocation();
    setAllCases(prev => {
      const now = new Date().toISOString();
      const next = prev.map(c => {
        if (c.id !== caseId) return c;
        return {
          ...c,
          updatedAt: now,
          lastUpdatedLocation: locUpdate || c.lastUpdatedLocation,
          orderLines: (c.orderLines || []).map(l => 
            l.id === lineId ? { ...l, status, photoUri: photoUri || l.photoUri, updatedAt: now } : l
          )
        };
      });
      import('@/utils/storage').then(m => m.saveCases(next));
      return next;
    });
  }, []);

  const advancePhase = useCallback((id: string, phase: PhaseNumber) => {
    updateCase(id, { currentPhase: phase });
  }, [updateCase]);

  const setSampleCollectionTime = useCallback((id: string, time: string) => {
    updateCase(id, { sampleCollectionTime: time, labDropoffIntent: true });
  }, [updateCase]);

  return (
    <CaseContext.Provider value={{
      cases, profile, loading, doctors, labs,
      getCaseById, updateCase,
      markDeparture, markArrival,
      setConsentPhoto, setDeviceReadingPhoto,
      savePCR, saveDoctorConsult,
      addProcedurePhoto, addSamplePhoto,
      saveExitVitals, saveLabDropoff,
      closeCase, refuseCase, setSampleCollectionTime,
      confirmSupply, updateOrderLine, advancePhase,
      login: loginUser, logout: logoutUser,
      refreshCases,
    }}>
      {children}
    </CaseContext.Provider>
  );
}

export function useCases() {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error('useCases must be used within CaseProvider');
  return ctx;
}

function sanitizeCases(cases: NurseCase[], isInitial: boolean): NurseCase[] {
  if (Platform.OS !== 'web') return cases;

  const currentOrigin = window.location.origin;
  
  return cases.map(c => {
    const newCase = { ...c };
    let changed = false;

    const sanitizeUri = (uri?: string) => {
      if (!uri) return uri;
      if (uri.startsWith('blob:')) {
        // Blobs are session-bound. If origin/port changed, or if we are initializing a new session,
        // the blobs from storage are definitely dead.
        if (!uri.includes(currentOrigin) || isInitial) {
          changed = true;
          return undefined;
        }
      }
      return uri;
    };

    newCase.consentPhotoUri = sanitizeUri(newCase.consentPhotoUri);
    newCase.deviceReadingPhotoUri = sanitizeUri(newCase.deviceReadingPhotoUri);
    newCase.sampleCollectionPhotoUri = sanitizeUri(newCase.sampleCollectionPhotoUri);
    newCase.procedurePhotos = newCase.procedurePhotos?.map(u => sanitizeUri(u) as string).filter(Boolean);
    newCase.samplePhotos = newCase.samplePhotos?.map(u => sanitizeUri(u) as string).filter(Boolean);
    newCase.voiceRecordingUri = sanitizeUri(newCase.voiceRecordingUri);
    
    if (newCase.pcr) {
      newCase.pcr = {
        ...newCase.pcr,
        formPage1Uri: sanitizeUri(newCase.pcr.formPage1Uri),
        formPage2Uri: sanitizeUri(newCase.pcr.formPage2Uri),
        prevPrescriptionUri: sanitizeUri(newCase.pcr.prevPrescriptionUri),
        prevMedicinePhotoUri: sanitizeUri(newCase.pcr.prevMedicinePhotoUri),
      };
    }

    if (newCase.labDropoff) {
      newCase.labDropoff = {
        ...newCase.labDropoff,
        photoUri: sanitizeUri(newCase.labDropoff.photoUri),
      };
    }

    if (newCase.orders) {
      newCase.orders = newCase.orders.map(o => ({
        ...o,
        photoUri: sanitizeUri(o.photoUri)
      }));
    }

    return newCase;
  });
}
