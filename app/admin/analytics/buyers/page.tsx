import { Suspense } from 'react';
import BuyerAnalyticsPage from '@/features/analytics/ui/BuyerAnalyticsPage';

export const metadata = { title: 'Analytics acheteurs — Ladini' };

// L'accès ADMIN est imposé par `app/admin/layout.tsx` (redirection) ET par chaque endpoint (`requireAdmin`).
export default function Page() {
  return (
    <Suspense fallback={null}>
      <BuyerAnalyticsPage />
    </Suspense>
  );
}
