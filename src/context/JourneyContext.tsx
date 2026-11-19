import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ChargingSession, Payment, Reservation, StationWithMetrics } from '../types/database';
import type { NavRoute } from '../services/routing';

type JourneyState = {
  station: StationWithMetrics | null;
  connectorId: string | null;
  reservation: Reservation | null;
  session: ChargingSession | null;
  payment: Payment | null;
  arrivalOffsetMin: number;
  navRoute: NavRoute | null;
  setStation: (s: StationWithMetrics | null) => void;
  setConnectorId: (id: string | null) => void;
  setReservation: (r: Reservation | null) => void;
  setSession: (s: ChargingSession | null) => void;
  setPayment: (p: Payment | null) => void;
  setArrivalOffsetMin: (n: number) => void;
  setNavRoute: (r: NavRoute | null) => void;
  resetJourney: () => void;
};

const JourneyContext = createContext<JourneyState | undefined>(undefined);

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [station, setStation] = useState<StationWithMetrics | null>(null);
  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [session, setSession] = useState<ChargingSession | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [arrivalOffsetMin, setArrivalOffsetMin] = useState(0);
  const [navRoute, setNavRoute] = useState<NavRoute | null>(null);

  const value = useMemo(
    () => ({
      station,
      connectorId,
      reservation,
      session,
      payment,
      arrivalOffsetMin,
      navRoute,
      setStation,
      setConnectorId,
      setReservation,
      setSession,
      setPayment,
      setArrivalOffsetMin,
      setNavRoute,
      resetJourney: () => {
        setStation(null);
        setConnectorId(null);
        setReservation(null);
        setSession(null);
        setPayment(null);
        setArrivalOffsetMin(0);
        setNavRoute(null);
      },
    }),
    [station, connectorId, reservation, session, payment, arrivalOffsetMin, navRoute],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used within JourneyProvider');
  return ctx;
}
