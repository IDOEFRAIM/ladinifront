"use client";

import React, { createContext, useContext, useState } from 'react';

const ZoneContext = createContext({ zoneId: null as string | null, setZoneId: (z: string | null) => {} });

export function useZone() {
  return useContext(ZoneContext);
}

export default function ZoneProvider({ children }: { children: React.ReactNode }) {
  const [zoneId, setZoneId] = useState<string | null>(null);
  return (
    <ZoneContext.Provider value={{ zoneId, setZoneId }}>
      {children}
    </ZoneContext.Provider>
  );
}
