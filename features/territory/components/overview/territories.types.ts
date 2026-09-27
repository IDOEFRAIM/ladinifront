export type ClimaticRegionData = { id: string; name: string; description: string | null; _count: { zones: number } };

export type LocationData = { id: string; name: string; code: string; isActive: boolean; climaticRegionId: string; climaticRegion: { name: string }; _count: { producers: number; orders: number; farms: number } };

export type LocationStat = { locationId: string; locationName: string; producers: number; orders: number; farms: number; gmv?: number };

export type TerritoryStatsData = { totalRegions: number; totalLocations: number; activeLocations: number; totalProducers: number; totalOrders: number; locationStats: LocationStat[] };
