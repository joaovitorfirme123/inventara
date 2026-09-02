import type { PriorityRuleConfig } from "@/lib/inventory-priority";
import {
  DEFAULT_PRIORITY_RULE,
  parsePriorityRuleConfig,
} from "@/lib/inventory-priority";
import { prisma } from "@/lib/prisma";

export type ActivePriorityRule = {
  ruleId: string | null;
  revisionId: string | null;
  name: string;
  version: number | null;
  configuration: PriorityRuleConfig;
};

function mapRule(rule: {
  id: string;
  name: string;
  revisions: Array<{ id: string; version: number; configuration: unknown }>;
}): ActivePriorityRule {
  const revision = rule.revisions[0];
  const configuration = revision ? parsePriorityRuleConfig(revision.configuration) : null;
  if (!revision || !configuration) {
    return {
      ruleId: null,
      revisionId: null,
      name: "Padrão Inventara",
      version: null,
      configuration: DEFAULT_PRIORITY_RULE,
    };
  }
  return {
    ruleId: rule.id,
    revisionId: revision.id,
    name: rule.name,
    version: revision.version,
    configuration,
  };
}

export async function getActivePriorityRule(organizationId: string): Promise<ActivePriorityRule> {
  const rule = await prisma.priorityRule.findUnique({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true, configuration: true },
      },
    },
  });
  return rule ? mapRule(rule) : {
    ruleId: null,
    revisionId: null,
    name: "Padrão Inventara",
    version: null,
    configuration: DEFAULT_PRIORITY_RULE,
  };
}

export async function getPriorityRuleSettings(organizationId: string) {
  const rule = await prisma.priorityRule.findUnique({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true, configuration: true },
      },
    },
  });
  if (!rule) return null;
  const active = mapRule(rule);
  return active.revisionId && active.version !== null ? { ...active, version: active.version } : null;
}

export async function savePriorityRule(input: {
  organizationId: string;
  actorId: string;
  name: string;
  configuration: PriorityRuleConfig;
}) {
  if (!input.name.trim() || input.name.trim().length > 80 || !parsePriorityRuleConfig(input.configuration)) {
    throw new Error("INVALID_PRIORITY_RULE");
  }

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.priorityRule.findUnique({
      where: { organizationId: input.organizationId },
      select: { id: true },
    });
    const rule = existing
      ? await transaction.priorityRule.update({
          where: { id: existing.id },
          data: { name: input.name.trim() },
          select: { id: true },
        })
      : await transaction.priorityRule.create({
          data: { organizationId: input.organizationId, name: input.name.trim() },
          select: { id: true },
        });
    const latest = await transaction.priorityRuleRevision.findFirst({
      where: { ruleId: rule.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;
    const revision = await transaction.priorityRuleRevision.create({
      data: { ruleId: rule.id, version, configuration: input.configuration },
      select: { id: true, version: true },
    });
    await transaction.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: existing ? "PRIORITY_RULE_UPDATED" : "PRIORITY_RULE_CREATED",
        entityType: "PRIORITY_RULE",
        entityId: rule.id,
        metadata: { name: input.name.trim(), revisionId: revision.id, version },
      },
    });
    return { ruleId: rule.id, revisionId: revision.id, version };
  }, { maxWait: 10_000, timeout: 30_000 });
}
