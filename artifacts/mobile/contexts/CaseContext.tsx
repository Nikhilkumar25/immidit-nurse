import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { NurseCase, NurseProfile, PCRData, DoctorConsultation, Vitals, LabDropoff, PhaseNumber } from '@/types/case';
import { loadCases, saveCases, loadProfile, seedIfNeeded } from '@/utils/storage';

interface CaseContextValue {
  cases: NurseCase[];
  profile: NurseProfile | null;
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
  closeCase: (id: string, outcome: NurseCase['caseOutcome'], notes: string) => void;
  confirmSupply: (caseId: string, supplyId: string, confirmed: boolean) => void;
  advancePhase: (id: string, phase: PhaseNumber) => void;
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<NurseCase[]>([]);
  const [profile, setProfile] = useState<NurseProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      await seedIfNeeded();
      const [c, p] = await Promise.all([loadCases(), loadProfile()]);
      setCases(c);
      setProfile(p);
      setLoading(false);
    }
    init();
  }, []);

  const persist = useCallback(async (updated: NurseCase[]) => {
    setCases(updated);
    await saveCases(updated);
  }, []);

  const updateCase = useCallback((id: string, updates: Partial<NurseCase>) => {
    setCases(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      saveCases(next);
      return next;
    });
  }, []);

  const getCaseById = useCallback((id: string) => {
    return cases.find(c => c.id === id);
  }, [cases]);

  const markDeparture = useCallback((id: string) => {
    updateCase(id, {
      departureTime: new Date().toISOString(),
      status: 'en_route',
      currentPhase: 2,
    });
  }, [updateCase]);

  const markArrival = useCallback((id: string, coords?: { lat: number; lng: number }) => {
    updateCase(id, {
      arrivalTime: new Date().toISOString(),
      status: 'arrived',
      currentPhase: 3,
      gpsCoordinates: coords,
    });
  }, [updateCase]);

  const setConsentPhoto = useCallback((id: string, uri: string) => {
    setCases(prev => {
      const c = prev.find(x => x.id === id);
      if (!c) return prev;
      const hasDevice = !!c.deviceReadingPhotoUri;
      const updates: Partial<NurseCase> = { consentFormPhotoUri: uri };
      if (hasDevice) {
        updates.currentPhase = 4;
        updates.status = 'in_progress';
      }
      const next = prev.map(x => x.id === id ? { ...x, ...updates } : x);
      saveCases(next);
      return next;
    });
  }, []);

  const setDeviceReadingPhoto = useCallback((id: string, uri: string) => {
    setCases(prev => {
      const c = prev.find(x => x.id === id);
      if (!c) return prev;
      const hasConsent = !!c.consentFormPhotoUri;
      const updates: Partial<NurseCase> = { deviceReadingPhotoUri: uri };
      if (hasConsent) {
        updates.currentPhase = 4;
        updates.status = 'in_progress';
      }
      const next = prev.map(x => x.id === id ? { ...x, ...updates } : x);
      saveCases(next);
      return next;
    });
  }, []);

  const savePCR = useCallback((id: string, data: PCRData) => {
    updateCase(id, { pcrCompleted: true, pcrData: data, currentPhase: 5 });
  }, [updateCase]);

  const saveDoctorConsult = useCallback((id: string, data: DoctorConsultation) => {
    updateCase(id, { doctorConsultation: data });
  }, [updateCase]);

  const addProcedurePhoto = useCallback((id: string, uri: string) => {
    setCases(prev => {
      const c = prev.find(x => x.id === id);
      if (!c) return prev;
      const photos = [...c.procedurePhotos, uri];
      const next = prev.map(x => x.id === id ? { ...x, procedurePhotos: photos } : x);
      saveCases(next);
      return next;
    });
  }, []);

  const addSamplePhoto = useCallback((id: string, uri: string) => {
    setCases(prev => {
      const c = prev.find(x => x.id === id);
      if (!c) return prev;
      const photos = [...c.samplePhotos, uri];
      const next = prev.map(x => x.id === id ? { ...x, samplePhotos: photos } : x);
      saveCases(next);
      return next;
    });
  }, []);

  const saveExitVitals = useCallback((id: string, vitals: Vitals) => {
    updateCase(id, { exitVitals: vitals });
  }, [updateCase]);

  const saveLabDropoff = useCallback((id: string, dropoff: LabDropoff) => {
    updateCase(id, { labDropoff: dropoff });
  }, [updateCase]);

  const closeCase = useCallback((id: string, outcome: NurseCase['caseOutcome'], notes: string) => {
    updateCase(id, {
      closeTime: new Date().toISOString(),
      status: 'closed',
      currentPhase: 6,
      caseOutcome: outcome,
      nurseNotes: notes,
    });
  }, [updateCase]);

  const confirmSupply = useCallback((caseId: string, supplyId: string, confirmed: boolean) => {
    setCases(prev => {
      const next = prev.map(c => {
        if (c.id !== caseId) return c;
        return {
          ...c,
          supplies: c.supplies.map(s => s.id === supplyId ? { ...s, confirmed } : s),
        };
      });
      saveCases(next);
      return next;
    });
  }, []);

  const advancePhase = useCallback((id: string, phase: PhaseNumber) => {
    updateCase(id, { currentPhase: phase });
  }, [updateCase]);

  return (
    <CaseContext.Provider value={{
      cases, profile, loading,
      getCaseById, updateCase,
      markDeparture, markArrival,
      setConsentPhoto, setDeviceReadingPhoto,
      savePCR, saveDoctorConsult,
      addProcedurePhoto, addSamplePhoto,
      saveExitVitals, saveLabDropoff,
      closeCase, confirmSupply, advancePhase,
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
