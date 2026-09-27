export interface WorkZoneItem {
  id: string;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  zonePath: string | null;
  manager: { id: string; name: string | null; email: string | null } | null;
  role: string | null;
  createdAt: string;
}

export interface ZoneOption {
  id: string;
  name: string;
  code: string;
  path: string | null;
  depth: number;
}

export interface MemberOption {
  userId: string;
  name: string;
  email: string;
}
