// Contrat des métriques du tableau de bord admin (GET /api/admin/metrics) — dérivé du service.
import type { getAdminDashboardStats } from '@/features/admin/services/admin-stats';

type StatsResult = Awaited<ReturnType<typeof getAdminDashboardStats>>;

export type AdminDashboardData = NonNullable<Extract<StatsResult, { data: unknown }>['data']>;
export type AdminActivityItem = AdminDashboardData['recentActivity'][number];
export type AdminTopZone = AdminDashboardData['topZones'][number];
