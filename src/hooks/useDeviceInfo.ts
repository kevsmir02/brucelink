import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getSystemInfo } from '../services/api';
import { SystemInfo } from '../types';

export const DEVICE_INFO_KEY = ['deviceInfo'] as const;

/**
 * Fetches device system info from /systeminfo.
 * Auto-refetches every time the screen comes into focus.
 * Replaces the manual useState/useFocusEffect/try-catch pattern
 * previously used in DashboardScreen and SettingsScreen.
 */
export function useDeviceInfo() {
  const result = useQuery<SystemInfo, Error>({
    queryKey: DEVICE_INFO_KEY,
    queryFn: getSystemInfo,
  });

  // Re-run the query whenever this screen is focused
  useFocusEffect(
    useCallback(() => {
      result.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return {
    info: result.data ?? null,
    isLoading: result.isLoading,
    // isError is true when there's NO cached data AND the fetch failed
    isError: result.isError && !result.data,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  };
}
