import path from "node:path";
import fs from "node:fs";
import { config } from "dotenv";

// Single env file for rb2b — .env (Next.js and worker both use it)
const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) config({ path: envFile });

import { prisma } from "../lib/reactivate/db";
import { JOB_NAMES, enqueue } from "../lib/reactivate/queue";
import { evaluateSegmentsForContact } from "../lib/reactivate/jobs/evaluateSegments";
import { processKnowledgeDocument } from "../lib/reactivate/jobs/processKnowledgeDoc";
import { indexKnowledgeBankDocumentSafe } from "../lib/reactivate/jobs/indexKnowledgeBankDoc";
import { sendCampaignEmailForContact } from "../lib/reactivate/jobs/sendCampaignEmail";
import { runFetchPixelDataJob } from "../lib/reactivate/jobs/fetchPixelData";
import { startSchedulePoller } from "../lib/reactivate/schedulePoller";

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
          where: {
            segmentId,
            enabled: true,
            emailFieldMap: { not: null }, // M16: only send when email field is mapped
          },
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
  } else if (job.name === JOB_NAMES.FetchPixelData) {
    const payload = job.payload as { pixel_id?: string; schedule_id?: string };
    const pixelId = payload?.pixel_id;
    if (pixelId) {
      const result = await runFetchPixelDataJob(pixelId, payload?.schedule_id);
      console.log(
        `[FetchPixelDataJob] pixel_id=${pixelId} pages=${result.pagesFetched} contacts=${result.contactsUpserted} events=${result.eventsInserted} skipped=${result.eventsSkipped} enqueued=${result.contactsEnqueued}`
      );
    }
  }
}

async function runWorker() {
  console.log("Reactivate worker started (polling rt_jobs + schedules)");
  const hf = process.env.HUGGINGFACE_TOKEN?.trim();
  const pc = process.env.PINECONE_API_KEY?.trim();
  console.log(`Env: HUGGINGFACE_TOKEN=${hf ? "set" : "missing"} PINECONE_API_KEY=${pc ? "set" : "missing"} (optional; needed for embedding/indexing)`);
  startSchedulePoller();
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
