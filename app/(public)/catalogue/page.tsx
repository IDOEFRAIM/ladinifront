import JsonLd from '@/components/seo/JsonLd';
import CatalogueClient from '@/features/products/components/catalogue/CatalogueClient';
import { fetchProductsServer, fetchFiltersServer } from '@/features/products/actions/get-catalogue-products';
import { catalogueMetadata, catalogueBreadcrumbJsonLd } from '@/features/products/seo/catalogue-seo';

// ISR plutôt que force-dynamic : le catalogue n'a pas besoin d'être exact à la
// milliseconde près (le stock réel est revérifié à la réservation) — servir une
// page mise en cache 30s évite de refaire le scan+join complet à chaque visite,
// ce qui rend la navigation quasi instantanée entre deux revalidations.
export const revalidate = 30;

// Statique volontairement : lire `searchParams` ici rendrait la page dynamique et
// ferait perdre l'ISR. Les filtres (client) ne créent pas d'URL indexables ; la
// canonical unique évite tout contenu dupliqué.
export const metadata = catalogueMetadata;

export default async function CataloguePage() {
  // Requêtes indépendantes : en parallèle pour raccourcir le temps avant le premier rendu.
  const [filters, initialProducts] = await Promise.all([fetchFiltersServer(), fetchProductsServer()]);
  const initialCategories = (filters?.categories || []).map((c: string) => ({ key: c, name: c }));
  const initialRegions = filters?.locations || [];

  async function serverLoad(params: { category?: string; region?: string; search?: string }) {
    'use server';
    return (await fetchProductsServer(params || {})) || [];
  }

  async function serverFetchFilters() {
    'use server';
    return await fetchFiltersServer();
  }

  return (
    <>
      <JsonLd data={catalogueBreadcrumbJsonLd()} />
      <CatalogueClient
        initialProducts={initialProducts}
        initialCategories={initialCategories}
        initialRegions={initialRegions}
        serverLoad={serverLoad}
        serverFetchFilters={serverFetchFilters}
      />
    </>
  );
}
