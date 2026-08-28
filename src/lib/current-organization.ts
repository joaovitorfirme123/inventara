export function getCurrentOrganizationId() {
  const organizationId = process.env.DEVELOPMENT_ORGANIZATION_ID;

  if (!organizationId) {
    throw new Error("DEVELOPMENT_ORGANIZATION_ID is not configured.");
  }

  return organizationId;
}
