// Contrat de GET /api/buyer/tracking/[orderId] — dérivé du retour du service.
import type { getOrderTrackingTimeline } from '@/features/buyer/services/buyer.service';

export type TrackingResponse = NonNullable<Awaited<ReturnType<typeof getOrderTrackingTimeline>>>;
export type TrackingTimelineStep = TrackingResponse['timeline'][number];
export type TrackingDelivery = TrackingResponse['delivery'];
export type TrackingItem = TrackingResponse['items'][number];
