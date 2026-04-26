import { NextResponse } from 'next/server';
import { getLocationStats } from '@/services/territory.service';

// 1. On change le type pour refléter que params est une Promise
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 2. On "await" params avant d'accéder à l'id
    const { id } = await params;

    const res = await getLocationStats(id);

    if (!res || !res.success) {
      return NextResponse.json(
        { success: false, error: res?.error || 'Unknown' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}