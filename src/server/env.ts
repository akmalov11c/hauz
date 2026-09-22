/**
 * Server-only access to the Appwrite secrets.
 *
 * These variables are deliberately NOT prefixed with VITE_, so Vite never
 * exposes them to the browser bundle. vite.config.ts loads .env into
 * process.env so this module can read them during SSR and inside server
 * functions. Reads are lazy and cached: the first server-side access validates
 * that everything is present and fails fast with a clear message if not.
 */

export interface AppwriteEnv {
  endpoint: string
  projectId: string
  apiKey: string
  functionId: string
}

let cached: AppwriteEnv | null = null

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in.`,
    )
  }
  return value
}

export function getEnv(): AppwriteEnv {
  if (!cached) {
    cached = {
      endpoint: required('APPWRITE_ENDPOINT'),
      projectId: required('APPWRITE_PROJECT_ID'),
      apiKey: required('APPWRITE_API_KEY'),
      functionId: process.env.APPWRITE_FUNCTION_ID ?? 'personal-account',
    }
  }

  return cached
}
