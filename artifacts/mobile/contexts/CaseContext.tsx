import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'expo-router';
import type {
  NurseCase, NurseProfile, PCRData, DoctorConsultation,
  Vitals, LabDropoff, PhaseNumber, RefusalData, DoctorProfile,
  OrderLineStatus,
} from '@/types/case';
import * as Location from 'expo-location';
import { loadCases, saveCases, loadProfile } from '@/utils/storage';

interface CaseContextValue {
  cases: NurseCase[];
  profile: NurseProfile | null;
  doctors: DoctorProfile[];
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
  const [loading, setLoading] = useState(true);

  const refreshCases = useCallback(async () => {
    try {
      const { loadCases: fetchCases, loadDoctors: fetchDoctors } = await import('@/utils/storage');
      const [cloudCases, d] = await Promise.all([fetchCases(), fetchDoctors()]);
      
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

        // Optimization: Avoid state trigger if nothing changed
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        return merged;
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
      const { loadCases: fetchCases, loadProfile: fetchProfile, loadDoctors: fetchDoctors } = await import('@/utils/storage');
      const [c, p, d] = await Promise.all([fetchCases(), fetchProfile(), fetchDoctors()]);
      setAllCases(c);
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

  const updateCase = useCallback(async (id: string, updates: Partial<NurseCase>) => {
    let locUpdate = {};
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        locUpdate = {
          lastUpdatedLocation: {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (e) {
      console.warn('GPS tracking failed during update:', e);
    }

    setAllCases(prev => {
      const now = new Date().toISOString();
      const next = prev.map(c => c.id === id ? { ...c, ...updates, ...locUpdate, updatedAt: now } : c);
      
      // Fast Path: Save to local disk immediately to survive camera/restarts
      import('@/utils/storage').then(m => m.saveCases(next));
      
      return next;
    });
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
    const updates: Partial<NurseCase> = { consentFormPhotoUri: uri };
    if (!!c.deviceReadingPhotoUri) { updates.currentPhase = 4; updates.status = 'in_progress'; }
    await updateCase(id, updates);
  }, [cases, updateCase]);

  const setDeviceReadingPhoto = useCallback(async (id: string, uri: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    const updates: Partial<NurseCase> = { deviceReadingPhotoUri: uri };
    if (!!c.consentFormPhotoUri) { updates.currentPhase = 4; updates.status = 'in_progress'; }
    await updateCase(id, updates);
  }, [cases, updateCase]);

  const savePCR = useCallback((id: string, data: PCRData) => {
    updateCase(id, { pcrCompleted: true, pcrData: data, currentPhase: 5 });
  }, [updateCase]);

  const saveDoctorConsult = useCallback((id: string, data: DoctorConsultation) => {
    updateCase(id, { doctorConsultation: data });
  }, [updateCase]);

  const addProcedurePhoto = useCallback(async (id: string, uri: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    await updateCase(id, { procedurePhotos: [...c.procedurePhotos, uri] });
  }, [cases, updateCase]);

  const addSamplePhoto = useCallback(async (id: string, uri: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    await updateCase(id, { samplePhotos: [...c.samplePhotos, uri] });
  }, [cases, updateCase]);

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

  const confirmSupply = useCallback((caseId: string, supplyId: string, confirmed: boolean) => {
    setAllCases(prev => {
      const now = new Date().toISOString();
      const next = prev.map(c => {
        if (c.id !== caseId) return c;
        return { ...c, updatedAt: now, supplies: c.supplies.map(s => s.id === supplyId ? { ...s, confirmed } : s) };
      });
      saveCases(next);
      return next;
    });
  }, []);

  const updateOrderLine = useCallback((caseId: string, lineId: string, status: OrderLineStatus, photoUri?: string) => {
    setAllCases(prev => {
      const now = new Date().toISOString();
      const next = prev.map(c => {
        if (c.id !== caseId) return c;
        return {
          ...c,
          updatedAt: now,
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

  return (
    <CaseContext.Provider value={{
      cases, profile, loading, doctors,
      getCaseById, updateCase,
      markDeparture, markArrival,
      setConsentPhoto, setDeviceReadingPhoto,
      savePCR, saveDoctorConsult,
      addProcedurePhoto, addSamplePhoto,
      saveExitVitals, saveLabDropoff,
      closeCase, refuseCase,
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
