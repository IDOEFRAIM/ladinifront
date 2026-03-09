import React from 'react';
import CreateOrganizationClient from './CreateOrganizationClient';
import { createOrganization } from '@/app/actions/admin.server';

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
