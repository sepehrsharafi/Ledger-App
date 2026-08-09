import type { SqlDriver } from './driver';

/**
 * Web stub. The embedded database targets iOS and Android; on web the app must run against the
 * HTTP backend (`EXPO_PUBLIC_USE_LOCAL_API=true` plus `npm run dev`). Keeping this file free of
 * the `expo-sqlite` import is what lets the web bundle build at all.
 */
export function createNativeDriver(): SqlDriver {
  throw new Error(
    'The embedded database is not available on web. Set EXPO_PUBLIC_USE_LOCAL_API=true and run "npm run dev" to use the HTTP API instead.',
  );
}
