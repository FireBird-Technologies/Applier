import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults are fine for this site. Prices are fetched from the API on each request (see lib/pricing.ts), so no
// incremental cache is needed. Add one here only if you later want cached pages.
export default defineCloudflareConfig();
