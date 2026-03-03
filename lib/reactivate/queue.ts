import { prisma } from "./db";

export const JOB_NAMES = {
  EvaluateSegments: "EvaluateSegmentsJob",
  ProcessKnowledgeDoc: "ProcessKnowledgeDocJob",
  IndexKnowledgeBankDoc: "IndexKnowledgeBankDocJob",
  SendCampaignEmail: "SendCampaignEmailJob",
} as const;

export async function enqueue(
  name: string,
  payload: Record<string, unknown>
): Promise<string> {
  const job = await prisma.rtJob.create({
    data: { name, payload: payload as object, status: "pending" },
  });
  return job.id;
}
