import { useCallback } from 'react';
import { PermissionsAndroid, type Permission } from 'react-native';

/**
 * Hook wrapping Android runtime permission requests with explanation dialogs.
 * Returns a requestPermission function that checks + requests in one call.
 */
export function usePermissions() {
  const requestPermission = useCallback(
    async (
      permission: Permission,
      title: string,
      message: string,
    ): Promise<boolean> => {
      const alreadyGranted = await PermissionsAndroid.check(permission);
      if (alreadyGranted) {
        return true;
      }

      const result = await PermissionsAndroid.request(permission, {
        title: `${title} Permission Required`,
        message,
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });

      return result === PermissionsAndroid.RESULTS.GRANTED;
    },
    [],
  );

  return { requestPermission };
}
