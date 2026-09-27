import type { MonitoringFilters, PaginationParams } from '@/types/monitoring';
import axios from 'axios';

export const BASE = '/api/monitoring';

// --- Utilitaires ---

export function buildQueryString(
  filters?: MonitoringFilters,
  pagination?: PaginationParams
): string {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
  }

  if (pagination) {
    if (pagination.cursor) params.set('cursor', pagination.cursor);
    if (pagination.limit) params.set('limit', String(pagination.limit));
    if (pagination.sortBy) params.set('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.set('sortOrder', pagination.sortOrder);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetcher<T>(url: string, options?: any): Promise<T> {
  try {
    const method = (options && options.method) || 'get';
    const axiosOptions: any = {
      url,
      method: method.toLowerCase(),
      headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
    };

    if (options && options.body) {
      axiosOptions.data = options.body;
    }

    const res = await axios(axiosOptions);
    return res.data as T;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'HTTP Error';
    throw new Error(message);
  }
}

// =========================================================
// 1. AGENT ACTIONS
// =========================================================
