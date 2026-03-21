import { Vibration } from 'react-native';

export function vibrate(pattern: number | number[] = 30) {
  try {
    Vibration.vibrate(pattern);
  } catch {
    // Silently ignore — emulators often lack VIBRATE support
  }
}
