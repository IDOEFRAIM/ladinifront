// Sitemap dynamique des fiches produit (next-sitemap ne connaît que les routes statiques).
import { gt } from 'drizzle-orm';
import { db } from '@/src/db';
import { products } from '@/src/db/schema';
import { SITE_URL } from '@/lib/seo';

// Dynamique (pas d'accès DB au build) ; le CDN met en cache 1 h via s-maxage.
export const dynamic = 'force-dynamic';

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET() {
  let rows: { id: string; updatedAt: Date }[] = [];
  try {
    rows = await db
      .select({ id: products.id, updatedAt: products.updatedAt })
      .from(products)
      .where(gt(products.quantityForSale, '0'))
      .limit(50000); // limite du protocole sitemap
  } catch (err) {
    console.error('[product-sitemap] DB indisponible:', err);
    return new Response('Service indisponible', { status: 503 });
  }

  const urls = rows
    .map(
      (r) =>
        `<url><loc>${escapeXml(`${SITE_URL}/publicProducts/${r.id}`)}</loc>` +
        `<lastmod>${new Date(r.updatedAt).toISOString()}</lastmod></url>`
    )
    .join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' } }
  );
}
