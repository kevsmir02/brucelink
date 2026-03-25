import { NativeModules, Platform } from 'react-native';

type BruceSystemUiNative = {
  setImmersiveNavigation: (enabled: boolean) => void;
};

const native: BruceSystemUiNative | undefined =
  Platform.OS === 'android' ? (NativeModules.BruceSystemUi as BruceSystemUiNative) : undefined;

/** Android: hide 3-button / gesture nav bar (immersive sticky). No-op elsewhere. */
export function setImmersiveNavigation(enabled: boolean): void {
  native?.setImmersiveNavigation?.(enabled);
}
