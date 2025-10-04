import cron from "node-cron";
import { runTopicDiscovery } from "../agents/topicDiscovery.js";

cron.schedule("0 * * * *", async () => {
  console.log("🔄 Running hourly discovery (Google Trends)…");

  try {
    const topics = await runTopicDiscovery();

    if (!topics.length) {
      console.log("⚠️ No new topics discovered");
      return;
    }

    console.log(`✅ Discovery finished. Found ${topics.length} new topics.`);
    topics.forEach((t) => {
      console.log(`📌 ${t.title} (${t.sources.length} sources)`);
    });
  } catch (err) {
    console.error("❌ Discovery cron failed:", err);
  }
});
