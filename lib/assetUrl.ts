export function normalizeAssetUrl(value?: string | null, kind: 'products' | 'audio' = 'products') {
  if (!value) return '/placeholder.jpg';
  if (typeof value !== 'string') return '/placeholder.jpg';
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('/')) return value;
  // Fallback: treat as legacy filename stored in DB
  return `/uploads/${kind === 'audio' ? 'audio' : 'products'}/${value}`;
}

export default normalizeAssetUrl;
