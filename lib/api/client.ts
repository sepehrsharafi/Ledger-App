import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { ApiError } from '@/lib/api/error';

export { ApiError };

/**
 * Resolves the Ledger API base URL, and therefore whether the app runs in HTTP mode at all.
 *
 * An empty result means "use the database embedded in the app" — the default, and what makes a
 * standalone APK work offline. Setting EXPO_PUBLIC_API_URL opts into the Express backend; the
 * host-based fallbacks below only apply in development, where a bare host means "my dev machine".
 */
function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured && configured.trim().length > 0) return configured.trim().replace(/\/$/, '');

  // Opt-in only: without an explicit URL the app uses its embedded database.
  if (!__DEV__ || process.env.EXPO_PUBLIC_USE_LOCAL_API !== 'true') return '';

  const port = process.env.EXPO_PUBLIC_API_PORT ?? '4000';
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];

  // A physical device must reach the dev machine by LAN IP, which is the host Metro is served on.
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${port}`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${port}`;
  return `http://localhost:${port}`;
}

export const API_BASE_URL = resolveBaseUrl();

const MISSING_URL_MESSAGE =
  'This build has no HTTP API configured. Remove the EXPO_PUBLIC_API_URL override to use the embedded database, or point it at a reachable host.';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

const REQUEST_TIMEOUT_MS = 15000;

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (API_BASE_URL.length === 0) throw new ApiError(0, MISSING_URL_MESSAGE);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = `${API_BASE_URL}/api${path}`;

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal ?? controller.signal,
    });

    const text = await response.text();
    const payload = text.length > 0 ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error: unknown }).error)
          : `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const hint = __DEV__
      ? 'Start it with "npm run dev" (runs the API and Expo together) and keep this device on the same Wi-Fi.'
      : 'Check that the API host is running and reachable from this device.';
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, `Timed out reaching the Ledger API at ${API_BASE_URL}. ${hint}`);
    }
    throw new ApiError(0, `Cannot reach the Ledger API at ${API_BASE_URL}. ${hint}`);
  } finally {
    clearTimeout(timeout);
  }
}
