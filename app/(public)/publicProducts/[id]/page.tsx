import type { Metadata } from 'next';
import JsonLd from '@/components/seo/JsonLd';
import ProductView from '@/features/products/components/ProductView';
import { notFound } from 'next/navigation';
import { loadProduct, productExists } from '@/features/products/services/product.service';
import { buildProductMetadata } from '@/features/products/seo/product-metadata';
import { productPageJsonLd } from '@/features/products/seo/product-jsonld';

// ISR : chaque page produit est mise en cache 30s et revalidée en arrière-plan,
// au lieu de retaper la DB à chaque clic depuis le catalogue (voir catalogue/page.tsx).
export const revalidate = 30;

interface ProductDetailPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    return buildProductMetadata(id, await loadProduct(id));
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
    const { id } = await params;
    const product = await loadProduct(id); // dédupliqué avec generateMetadata (React cache)

    if (!product) {
        // Vrai 404 HTTP (et non une page d'erreur en 200 = « soft 404 » pour Google) — mais seulement si le produit
        // n'existe réellement pas. Si la lecture a échoué (panne DB), on lève : l'ISR garde la dernière bonne version.
        if (!(await productExists(id))) notFound();
        throw new Error('PRODUCT_TEMPORARILY_UNAVAILABLE');
    }

    return (
        <main style={{ backgroundColor: '#FDFCFB', minHeight: '100vh' }}>
            <JsonLd data={productPageJsonLd(product)} />
            <ProductView product={product} />
        </main>
    );
}
