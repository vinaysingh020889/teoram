// apps/api/src/jobs/discovery.cron.ts
import "dotenv/config";
import cron from "node-cron";
import { runTopicDiscovery } from "../agents/topicDiscovery.js";

async function executeDiscovery() {
  console.log(`\n? [${new Date().toISOString()}] Starting Discovery...`);
  try {
    const topics = await runTopicDiscovery();
    if (!topics?.length) {
      console.log("?? No new topics discovered.");
    } else {
      console.log(`? Discovery completed. ${topics.length} topics found.`);
      for (const t of topics) {
        console.log(`• ${t.title} (${t.sources?.length || 0} sources)`);
      }
    }
  } catch (err) {
    console.error("? Discovery cron failed:", err);
  }
  console.log(`?? Waiting for next run...\n`);
}

// Run once immediately
executeDiscovery();

// Schedule every 30 min
cron.schedule("*/30 * * * *", executeDiscovery);
