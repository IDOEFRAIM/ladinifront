import OrgListClient from '@/app/admin/organizations/OrgListClient';
import { fetchOrganizations } from '@/app/actions/admin.server';

export default async function AdminOrganizationsListPage() {
  const orgs = await fetchOrganizations();

  // try to resolve current user from session to bind server actions
  let userId: string | undefined = undefined;
  try {
    const sessionMod = await import('@/lib/session');
    const session = await sessionMod.getSessionFromRequest({} as any).catch(() => null);
    userId = session?.userId;
  } catch (e) {
    // ignore
  }

  let serverApproveOrg = undefined;
  let serverSelectOrg = undefined;
  try {
    const adminMod = await import('@/app/actions/admin.server');
    const orgMod = await import('@/app/actions/org.server');
    const approveOrganization = adminMod.approveOrganization;
    const selectOrganizationAction = orgMod.selectOrganizationAction;

    serverApproveOrg = async (organizationId: string) => {
      try {
        const res = await approveOrganization(organizationId, userId);
        return { success: true, data: res };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    };

    serverSelectOrg = async (organizationId: string) => {
      try {
        const res = await selectOrganizationAction(String(userId), organizationId);
        return res || { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    };
  } catch (e) {
    // ignore - fall back to client API calls
  }

  return <OrgListClient initialOrgs={orgs || []} />;
}
