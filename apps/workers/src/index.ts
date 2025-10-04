import "dotenv/config";
import { topicDiscovery } from "./jobs/topicDiscovery.js";
import { sourceCollector } from "./jobs/sourceCollector.js";
import { processApproved } from "./jobs/processApproved.js";
import { publish } from "./jobs/publish.js";

(async function main(){
  await topicDiscovery();
  await sourceCollector();
  // After approving sources in CMS, run again or call processApproved directly
  await processApproved();
  await publish();
})().catch(e=>{ console.error(e); process.exit(1); });