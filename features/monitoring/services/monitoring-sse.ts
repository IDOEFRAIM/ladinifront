import type { MonitoringEvent } from '@/types/monitoring';
import { BASE } from '@/features/monitoring/services/monitoring-http';

export class MonitoringSSE {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(event: MonitoringEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Se connecter au stream SSE */
  connect(role?: string): void {
    if (this.eventSource) this.disconnect();

    const params = role ? `?role=${role}` : '';
    this.eventSource = new EventSource(`${BASE}/stream${params}`);

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const parsed: MonitoringEvent = JSON.parse(event.data);
        this.dispatch(parsed.type, parsed);
        this.dispatch('*', parsed); // Wildcard
      } catch (err) {
        console.error('[MonitoringSSE] Parse error:', err);
      }
    };

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.eventSource = null;
      this.tryReconnect(role);
    };
  }

  /** Déconnecter */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.eventSource?.close();
    this.eventSource = null;
    this.reconnectAttempts = 0;
  }

  /** Écouter un type d'événement */
  on(type: string, callback: (event: MonitoringEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /** Statut de la connexion */
  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  private dispatch(type: string, event: MonitoringEvent): void {
    this.listeners.get(type)?.forEach((cb) => cb(event));
  }

  private tryReconnect(role?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[MonitoringSSE] Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect(role);
    }, Math.min(delay, 30000)); // Cap at 30s
  }
}

/** Singleton SSE instance */
export const monitoringSSE = new MonitoringSSE();
