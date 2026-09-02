export const PERMISSIONS = {
  VIEW_DASHBOARD: "Acessar dashboard",
  VIEW_PRODUCTS: "Consultar produtos e estoque",
  IMPORT_CSV: "Importar arquivos CSV",
  VIEW_INVENTORIES: "Consultar inventários e prioridades",
  VIEW_REPORTS: "Consultar e exportar relatórios",
  VIEW_NOTIFICATIONS: "Consultar notificações",
  MANAGE_USERS: "Gerenciar usuários e convites",
  MANAGE_GOALS: "Gerenciar metas de cobertura",
  MANAGE_PLANS: "Gerenciar planejamentos de inventário",
  CLEAR_DATA: "Limpar dados da organização",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type Role = "PLATFORM_ADMIN" | "OWNER" | "MEMBER";

const ROLE_PERMISSION_KEYS: Record<Role, readonly Permission[]> = {
  PLATFORM_ADMIN: [],
  OWNER: Object.keys(PERMISSIONS) as Permission[],
  MEMBER: [
    "VIEW_DASHBOARD",
    "VIEW_PRODUCTS",
    "IMPORT_CSV",
    "VIEW_INVENTORIES",
    "VIEW_REPORTS",
    "VIEW_NOTIFICATIONS",
  ],
};

export function hasPermission(role: string, permission: Permission) {
  return ROLE_PERMISSION_KEYS[role as Role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: string) {
  return ROLE_PERMISSION_KEYS[role as Role]?.map((permission) => PERMISSIONS[permission]) ?? [];
}

export function getPermissionMatrix() {
  return (Object.keys(PERMISSIONS) as Permission[]).map((permission) => ({
    permission,
    label: PERMISSIONS[permission],
    OWNER: hasPermission("OWNER", permission),
    MEMBER: hasPermission("MEMBER", permission),
  }));
}
