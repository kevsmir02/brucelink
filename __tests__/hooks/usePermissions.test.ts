/**
 * Tests for usePermissions hook — wraps Android runtime permission requests.
 */

import { renderHook, act } from '@testing-library/react-native';
import { PermissionsAndroid, Platform } from 'react-native';

// Ensure we're testing Android path
beforeAll(() => {
  Platform.OS = 'android';
});

import { usePermissions } from '../../src/hooks/usePermissions';

describe('usePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports a requestPermission function', () => {
    const { result } = renderHook(() => usePermissions());
    expect(typeof result.current.requestPermission).toBe('function');
  });

  it('returns granted=true when permission is already granted', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);

    const { result } = renderHook(() => usePermissions());
    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        'Location',
        'Needed for GPS features',
      );
    });
    expect(granted).toBe(true);
  });

  it('requests permission when not yet granted', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(
      PermissionsAndroid.RESULTS.GRANTED,
    );

    const { result } = renderHook(() => usePermissions());
    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        'Location',
        'Needed for GPS features',
      );
    });
    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      expect.objectContaining({ title: expect.stringContaining('Location') }),
    );
    expect(granted).toBe(true);
  });

  it('returns granted=false when permission is denied', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(
      PermissionsAndroid.RESULTS.DENIED,
    );

    const { result } = renderHook(() => usePermissions());
    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        'Location',
        'Needed for GPS features',
      );
    });
    expect(granted).toBe(false);
  });
});
