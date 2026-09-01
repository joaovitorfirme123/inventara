export const INVENTORY_PLAN_STATUSES = [
  "PENDING",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export type InventoryPlanStatus = (typeof INVENTORY_PLAN_STATUSES)[number];

export const inventoryPlanStatusLabels: Record<InventoryPlanStatus, string> = {
  PENDING: "Pendente",
  SCHEDULED: "Programado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Finalizado",
};

const nextStatuses: Record<InventoryPlanStatus, InventoryPlanStatus[]> = {
  PENDING: ["SCHEDULED"],
  SCHEDULED: ["PENDING", "IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
};

export function isInventoryPlanStatus(value: string): value is InventoryPlanStatus {
  return INVENTORY_PLAN_STATUSES.some((status) => status === value);
}

export function getAllowedNextInventoryPlanStatuses(status: InventoryPlanStatus) {
  return [status, ...nextStatuses[status]];
}

export function canTransitionInventoryPlanStatus(
  current: InventoryPlanStatus,
  next: InventoryPlanStatus,
) {
  return current === next || nextStatuses[current].includes(next);
}
