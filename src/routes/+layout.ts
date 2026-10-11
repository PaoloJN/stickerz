import { dev } from "$app/environment";
import { injectAnalytics } from "@vercel/analytics/sveltekit";

// Vercel Web Analytics (enabled on the project in the dashboard); no-op in dev
injectAnalytics({ mode: dev ? "development" : "production" });
