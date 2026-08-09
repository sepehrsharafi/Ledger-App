import { useCallback, useRef, useState } from 'react';

/**
 * Wires any number of refetchers into a single pull-to-refresh handler.
 * The refetchers are held in a ref so the callback identity stays stable across renders.
 */
export function useRefresh(...refetchers: (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(refetchers);
  latest.current = refetchers;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(latest.current.map((refetch) => refetch()));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}
