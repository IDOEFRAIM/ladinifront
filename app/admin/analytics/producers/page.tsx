import { Suspense } from 'react';
import ProducerAnalyticsPage from '@/features/analytics/ui/ProducerAnalyticsPage';

export const metadata = { title: 'Analytics producteurs — Ladini' };

// L'accès ADMIN est imposé par `app/admin/layout.tsx` (redirection) ET par chaque endpoint (`requireAdmin`).
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProducerAnalyticsPage />
    </Suspense>
  );
}
