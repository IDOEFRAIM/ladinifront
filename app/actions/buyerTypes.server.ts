'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

export async function fetchBuyerTypes() {
  return db.query.buyerTypes.findMany({
    columns: { id: true, name: true, description: true },
  });
}
