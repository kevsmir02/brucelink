import { THEME_TOKENS } from '../../src/theme/tokens';
import { COLORS, applyThemeMode, resolveThemeMode } from '../../src/utils/constants';

describe('theme mode behavior', () => {
  it('uses #8627a6 for accent/primary color in both modes', () => {
    expect(THEME_TOKENS.light.colors.primary).toBe('#8627a6');
    expect(THEME_TOKENS.dark.colors.primary).toBe('#8627a6');

    applyThemeMode('light');
    expect(COLORS.primary).toBe('#8627a6');

    applyThemeMode('dark');
    expect(COLORS.primary).toBe('#8627a6');
  });

  it('resolves Dark/Light/System correctly', () => {
    expect(resolveThemeMode('dark', 'light')).toBe('dark');
    expect(resolveThemeMode('light', 'dark')).toBe('light');
    expect(resolveThemeMode('system', 'light')).toBe('light');
    expect(resolveThemeMode('system', 'dark')).toBe('dark');
    expect(resolveThemeMode('system', null)).toBe('dark');
  });

  it('applies dark and light palettes to shared COLORS', () => {
    applyThemeMode('dark');
    expect(COLORS.background).toBe(THEME_TOKENS.dark.colors.background);
    expect(COLORS.text).toBe(THEME_TOKENS.dark.colors.text);

    applyThemeMode('light');
    expect(COLORS.background).toBe(THEME_TOKENS.light.colors.background);
    expect(COLORS.text).toBe(THEME_TOKENS.light.colors.text);
  });
});
