import { NextResponse } from 'next/server';
import { checkPublicProductById } from '@/app/actions/debugPublicProduct.server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id query param is required' }, { status: 400 });

    // Optional simple protection: require DEBUG_API_KEY if set
    const debugKey = process.env.DEBUG_API_KEY;
    if (debugKey) {
      const provided = url.searchParams.get('key') || '';
      if (provided !== debugKey) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const data = await checkPublicProductById(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error('debug/publicProductCheck error:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
