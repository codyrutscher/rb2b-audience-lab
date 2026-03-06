import { prisma } from "./db";

export const JOB_NAMES = {
  EvaluateSegments: "EvaluateSegmentsJob",
  ProcessKnowledgeDoc: "ProcessKnowledgeDocJob",
  IndexKnowledgeBankDoc: "IndexKnowledgeBankDocJob",
  SendCampaignEmail: "SendCampaignEmailJob",
  FetchPixelData: "FetchPixelDataJob",
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

export async function enqueueMany(
  name: string,
  payloads: Record<string, unknown>[]
): Promise<void> {
  if (payloads.length === 0) return;
  const BATCH = 100;
  for (let i = 0; i < payloads.length; i += BATCH) {
    const chunk = payloads.slice(i, i + BATCH);
    await prisma.rtJob.createMany({
      data: chunk.map((payload) => ({
        name,
        payload: payload as object,
        status: "pending",
      })),
    });
  }
}
