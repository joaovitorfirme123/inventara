import "server-only";
import { requireSessionContext } from "@/lib/session";

export async function getCurrentOrganizationId() {
  return (await requireSessionContext()).user.organizationId;
}
