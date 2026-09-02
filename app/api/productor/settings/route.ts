import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/api-guard';
import { updateProducerSettings } from '@/app/actions/productor.server';

export async function POST(req: Request) {
  const { user, error } = await requireProducer();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    // (2026-09-02) `dailyAdviceTime` retiré — la colonne n'existe plus sur `users`.
    const { producerId, name, email, phone, location, whatsappEnabled, latitude, longitude, cnibNumber } = body;

    if (!producerId || producerId !== (user.producerId || user.id)) {
      return NextResponse.json({ error: 'Invalid producer' }, { status: 403 });
    }

    const updated = await updateProducerSettings(user.id, producerId, { name, email, phone, location, whatsappEnabled, latitude, longitude, cnibNumber });
    return NextResponse.json({ ok: true, producer: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
