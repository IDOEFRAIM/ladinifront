import { Suspense } from 'react';
import MarketBalancePage from '@/features/analytics/ui/MarketBalancePage';

export const metadata = { title: 'Market Balance — Ladini' };

// L'accès ADMIN est imposé par `app/admin/layout.tsx` (redirection) ET par chaque endpoint (`requireAdmin`).
export default function Page() {
  return (
    <Suspense fallback={null}>
      <MarketBalancePage />
    </Suspense>
  );
}
