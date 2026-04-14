import { COLORS, FONTS } from '../../src/utils/constants';
import { THEME_TOKENS } from '../../src/theme/tokens';

describe('design tokens rollout', () => {
  it('exposes a light token palette with the approved primary and background', () => {
    expect(THEME_TOKENS.light.colors.primary).toBe('#8627a6');
    expect(THEME_TOKENS.light.colors.background).toBe('#F8FAFC');
  });

  it('wires shared COLORS constants to the dark theme baseline', () => {
    expect(COLORS.primary).toBe(THEME_TOKENS.dark.colors.primary);
    expect(COLORS.background).toBe(THEME_TOKENS.dark.colors.background);
    expect(COLORS.accent).toBe(THEME_TOKENS.dark.colors.accent);
  });

  it('uses typography defaults suitable for Android utility UI', () => {
    expect(FONTS.regular).toBe('sans-serif');
    expect(FONTS.mono).toBe('monospace');
  });
});
