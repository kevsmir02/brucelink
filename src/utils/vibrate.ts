import { Vibration } from 'react-native';

export function vibrate(pattern: number | number[] = 30) {
  try {
    if (Array.isArray(pattern)) {
      Vibration.vibrate(pattern);
    } else {
      Vibration.vibrate(pattern);
    }
  } catch {
    // Silently ignore — emulators often lack VIBRATE support
  }
}
