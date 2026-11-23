import "server-only";

/**
 * Firebase settings. Explicit env vars win (.env.local, apphosting.yaml); on App Hosting the
 * platform also provides FIREBASE_CONFIG (projectId, storageBucket) and FIREBASE_WEBAPP_CONFIG
 * (apiKey), so nothing else has to be copied by hand.
 */
function parse(name: string): Record<string, string> {
  try {
    return JSON.parse(process.env[name] ?? "{}");
  } catch {
    return {};
  }
}

export function firebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ?? parse("FIREBASE_CONFIG").projectId ?? "demo-onebouldering"
  );
}

export function firebaseStorageBucket(): string {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ??
    parse("FIREBASE_CONFIG").storageBucket ??
    "demo-onebouldering.appspot.com"
  );
}

/** Web API key for the Auth REST API (office sign-in). */
export function firebaseApiKey(): string | undefined {
  return process.env.FIREBASE_API_KEY || parse("FIREBASE_WEBAPP_CONFIG").apiKey || undefined;
}
