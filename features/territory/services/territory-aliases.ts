import { getLocations, createLocation, updateLocation, toggleLocationActive, deleteLocation } from '@/features/territory/services/locations';

// Legacy aliases
export const getZones = getLocations;

export const createZone = createLocation;

export const updateZone = updateLocation;

export const toggleZoneActive = toggleLocationActive;

export const deleteZone = deleteLocation;
