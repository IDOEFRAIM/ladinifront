import type { Metadata } from 'next';
import JsonLd from '@/components/seo/JsonLd';
import ProductView from '@/features/products/components/ProductView';
import ProductNotFound from '@/features/products/components/ProductNotFound';
import { loadProduct } from '@/features/products/services/product.service';
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

    if (!product) return <ProductNotFound id={id} />;

    return (
        <main style={{ backgroundColor: '#FDFCFB', minHeight: '100vh' }}>
            <JsonLd data={productPageJsonLd(product)} />
            <ProductView product={product} />
        </main>
    );
}
