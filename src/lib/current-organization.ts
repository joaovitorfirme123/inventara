import "server-only";
import { requireOrganizationSessionContext } from "@/lib/session";

export async function getCurrentOrganizationId() {
  return (await requireOrganizationSessionContext()).user.organizationId;
}
