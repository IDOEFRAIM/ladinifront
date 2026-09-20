import React from 'react';
import CreateOrganizationClient from '@/features/organization/components/CreateOrganizationClient';
import { createOrganization } from '@/features/admin/services/admin-organizations.service';

export const dynamic = 'force-dynamic';

export default async function CreateOrganizationPage() {
  async function serverCreateOrganization(data: any) {
    'use server'
    try {
      const res = await createOrganization(data);
      return res;
    } catch (e) {
      console.error('server create org error', e);
      return { success: false, error: 'Erreur serveur' };
    }
  }

  return <CreateOrganizationClient serverCreateOrganization={serverCreateOrganization} />;
}
