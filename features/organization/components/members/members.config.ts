export const ORG_ROLES = [
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'ZONE_MANAGER', label: 'Gestionnaire de Zone' },
  { value: 'SALES_MANAGER', label: 'Responsable Ventes' },
  { value: 'FIELD_AGENT', label: 'Agent de Terrain' },
  { value: 'DELIVERY_AGENT', label: 'Livreur' },
] as const;

export interface MemberItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  systemRole: string;
  orgRole: string;
  roleDef: { id: string; name: string; permissions: string[] } | null;
  managedZone: { id: string; name: string } | null;
  joinedAt: string;
}

export interface RoleOption {
  id: string;
  name: string;
}

export const PAGE_SIZE = 10;

export interface ProducerOption {
  id: string;
  businessName: string;
  email: string;
  phone?: string;
}
