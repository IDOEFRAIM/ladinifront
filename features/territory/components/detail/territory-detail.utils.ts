export const getStatChanges = (prev: any, current: any) => {
  if (!prev) return [];
  return Object.keys(current).filter(k => current[k] !== prev[k]);
};

export const createFeedItem = (diff: number) => ({
  id: String(Date.now()),
  title: 'Mise à jour activité',
  delta: `${diff >= 0 ? '+' : ''}${diff} cmd`,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

export const mapZoneToForm = (zone: any) => ({
  name: zone.name || '',
  code: zone.code || '',
  latitude: zone.latitude?.toString() || '',
  longitude: zone.longitude?.toString() || '',
  climaticRegionId: zone.climaticRegionId || zone.climaticRegion?.id || ''
});

export const extractCounts = (zone: any) => ({
  producers: zone._count?.producers || 0,
  orders: zone._count?.orders || 0,
  farms: zone._count?.farms || 0
});
