import path from "node:path";
import fs from "node:fs";
import { config } from "dotenv";

const root = process.cwd();
const envLocal = path.join(root, ".env.local");
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) config({ path: envFile });
if (fs.existsSync(envLocal)) config({ path: envLocal });

import { prisma } from "../lib/reactivate/db";
import { JOB_NAMES, enqueue } from "../lib/reactivate/queue";
import { evaluateSegmentsForContact } from "../lib/reactivate/jobs/evaluateSegments";
import { processKnowledgeDocument } from "../lib/reactivate/jobs/processKnowledgeDoc";
import { indexKnowledgeBankDocumentSafe } from "../lib/reactivate/jobs/indexKnowledgeBankDoc";
import { sendCampaignEmailForContact } from "../lib/reactivate/jobs/sendCampaignEmail";

const POLL_MS = 2000;

async function processJob(job: { id: string; name: string; payload: unknown }) {
  if (job.name === JOB_NAMES.EvaluateSegments) {
    const payload = job.payload as { contact_id?: string };
    const contactId = payload?.contact_id;
    if (contactId) {
      const segmentId = await evaluateSegmentsForContact(contactId);
      console.log(`[EvaluateSegmentsJob] contact_id=${contactId} -> segment_id=${segmentId ?? "none"}`);
      if (segmentId) {
        const campaigns = await prisma.rtSegmentCampaign.findMany({
          where: { segmentId, enabled: true },
          select: { id: true },
        });
        for (const c of campaigns) {
          await enqueue(JOB_NAMES.SendCampaignEmail, {
            contact_id: contactId,
            segment_campaign_id: c.id,
          });
        }
      }
    }
  } else if (job.name === JOB_NAMES.SendCampaignEmail) {
    const payload = job.payload as { contact_id?: string; segment_campaign_id?: string };
    const contactId = payload?.contact_id;
    const segmentCampaignId = payload?.segment_campaign_id;
    if (contactId && segmentCampaignId) {
      const result = await sendCampaignEmailForContact(contactId, segmentCampaignId);
      console.log(
        `[SendCampaignEmailJob] contact_id=${contactId} campaign_id=${segmentCampaignId} sent=${result.sent}${result.error ? ` error=${result.error}` : ""}`
      );
    }
  } else if (job.name === JOB_NAMES.ProcessKnowledgeDoc) {
    const payload = job.payload as { document_id?: string };
    const documentId = payload?.document_id;
    if (documentId) {
      await processKnowledgeDocument(documentId);
      console.log(`[ProcessKnowledgeDocJob] document_id=${documentId} done`);
    }
  } else if (job.name === JOB_NAMES.IndexKnowledgeBankDoc) {
    const payload = job.payload as { document_id?: string };
    const documentId = payload?.document_id;
    if (documentId) {
      await indexKnowledgeBankDocumentSafe(documentId);
      console.log(`[IndexKnowledgeBankDocJob] document_id=${documentId} indexed`);
    }
  }
}

async function runWorker() {
  console.log("Reactivate worker started (polling rt_jobs)");
  const hf = process.env.HUGGINGFACE_TOKEN?.trim();
  const pc = process.env.PINECONE_API_KEY?.trim();
  console.log(`Env: HUGGINGFACE_TOKEN=${hf ? "set" : "missing"} PINECONE_API_KEY=${pc ? "set" : "missing"} (optional; needed for embedding/indexing)`);
  while (true) {
    const job = await prisma.rtJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    if (job) {
      await prisma.rtJob.update({
        where: { id: job.id },
        data: { status: "processing", updatedAt: new Date() },
      });
      try {
        await processJob(job);
        await prisma.rtJob.update({
          where: { id: job.id },
          data: { status: "completed", updatedAt: new Date() },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[${job.name}] failed:`, msg);
        await prisma.rtJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            error: msg,
            updatedAt: new Date(),
          },
        });
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

runWorker().catch((e) => {
  console.error(e);
  process.exit(1);
});
