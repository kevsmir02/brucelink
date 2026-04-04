import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

import { FsToggle } from '../src/components/FsToggle';
import { navigatorWebSource } from '../src/assets/navigatorWebSource';

describe('Phase 3 extraction contracts', () => {
  it('FsToggle exposes both filesystems and emits the selected value', async () => {
    const onSwitchFs = jest.fn();

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <FsToggle fs="SD" onSwitchFs={onSwitchFs} />,
      );
    });

    const buttons = renderer!.root.findAllByType(TouchableOpacity);
    expect(buttons.length).toBe(2);

    await ReactTestRenderer.act(() => {
      buttons[1].props.onPress();
    });

    expect(onSwitchFs).toHaveBeenCalledWith('LittleFS');
  });

  it('navigatorWebSource points to a bundled URI', () => {
    expect(typeof navigatorWebSource.uri).toBe('string');
    expect(navigatorWebSource.uri.length).toBeGreaterThan(0);
  });
});
