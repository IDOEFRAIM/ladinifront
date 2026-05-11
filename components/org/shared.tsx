'use client';

import React from 'react';
import { Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type BannerMessage = { type: 'success' | 'error'; text: string } | null;

// ─── MessageBanner ────────────────────────────────────────────────────────────
export function MessageBanner({ message }: { message: BannerMessage }) {
  if (!message) return null;
  return (
    <div
      className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
        message.type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      {message.text}
    </div>
  );
}

// ─── PageSpinner ──────────────────────────────────────────────────────────────
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="animate-spin text-emerald-600" />
    </div>
  );
}

// ─── OrgModal ─────────────────────────────────────────────────────────────────
interface OrgModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  scrollable?: boolean;
}

export function OrgModal({ title, onClose, children, footer, maxWidth = 'max-w-md', scrollable = false }: OrgModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white rounded-2xl w-full ${maxWidth} ${scrollable ? 'max-h-[90vh] overflow-hidden flex flex-col' : ''} shadow-xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400">
            <X size={20} />
          </button>
        </div>
        <div className={`px-6 py-5 space-y-4 ${scrollable ? 'flex-1 overflow-y-auto' : ''}`}>
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

// ─── ModalFooter ──────────────────────────────────────────────────────────────
interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  saving: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function ModalFooter({ onCancel, onConfirm, confirmLabel, saving, disabled = false, icon }: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200">
      <button
        onClick={onCancel}
        className="px-5 py-2.5 rounded-full text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors"
      >
        Annuler
      </button>
      <button
        onClick={onConfirm}
        disabled={saving || disabled}
        className="inline-flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : icon}
        {confirmLabel}
      </button>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  count: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, count, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50">
      <span className="text-xs text-stone-500">
        {count} résultat{count > 1 ? 's' : ''} · Page {page}/{totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-stone-200 disabled:opacity-30 text-stone-500"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-stone-200 disabled:opacity-30 text-stone-500"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Form field class constants ───────────────────────────────────────────────
export const INPUT_CLASS = 'w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors';
export const SELECT_CLASS = 'w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-colors';
export const LABEL_CLASS = 'block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5';
