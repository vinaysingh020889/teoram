import { fetchEvidence } from "./fetchEvidence.js";
import { articleComposer } from "./articleComposer.js";
import { reviewAgent } from "./reviewAgent.js";
export async function processApproved(){ await fetchEvidence(); await articleComposer(); await reviewAgent(); }