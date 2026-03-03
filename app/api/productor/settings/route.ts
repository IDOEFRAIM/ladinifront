import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireProducer } from '@/lib/api-guard';

export async function POST(req: Request) {
  const { user, error } = await requireProducer();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { producerId, name, email, phone, location } = body;

    if (!producerId || producerId !== (user.producerId || user.id)) {
      return NextResponse.json({ error: 'Invalid producer' }, { status: 403 });
    }

    // Update user contact info
    await prisma.user.update({ where: { id: user.id }, data: { name: name ?? undefined, email: email ?? undefined, phone: phone ?? undefined } });

    // Update producer business info (store location in region for now)
    const updated = await prisma.producer.update({
      where: { id: producerId },
      data: { businessName: name ?? undefined, region: location ?? undefined }
    });

    return NextResponse.json({ ok: true, producer: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
