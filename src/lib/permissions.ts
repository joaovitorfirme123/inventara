export const ROLE_PERMISSIONS = {
  PLATFORM_ADMIN: [
    "Criar organizações",
    "Consultar organizações",
    "Consultar usuários e permissões",
    "Apagar organizações",
  ],
  OWNER: [
    "Acessar dashboard",
    "Consultar produtos e estoque",
    "Importar arquivos CSV",
    "Consultar inventários e prioridades",
    "Gerenciar usuários da organização",
    "Limpar dados da organização",
  ],
  MEMBER: [
    "Acessar dashboard",
    "Consultar produtos e estoque",
    "Importar arquivos CSV",
    "Consultar inventários e prioridades",
  ],
} as const;

export function getRolePermissions(role: string) {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? [];
}
