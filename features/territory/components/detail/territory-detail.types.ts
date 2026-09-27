// ─── Types locaux ───
export interface ZoneDetail {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  latitude?: number | null;
  longitude?: number | null;
  climaticRegionId: string;
  climaticRegion: { name: string };
  _count: {
    producers: number;
    orders: number;
    farms: number;
  };
}
