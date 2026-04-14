import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

import { ThemeModeSelector } from '../../src/components/ThemeModeSelector';
import { ThemeProvider } from '../../src/contexts/ThemeContext';

describe('ThemeModeSelector', () => {
  it('shows Light, Dark, and System options and emits selection', () => {
    const onChange = jest.fn();

    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <ThemeModeSelector value="dark" onChange={onChange} />
        </ThemeProvider>,
      );
    });

    const labels = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(labels).toContain('Light');
    expect(labels).toContain('Dark');
    expect(labels).toContain('System');

    const buttons = renderer!.root.findAllByType(TouchableOpacity);
    expect(buttons.length).toBe(3);

    ReactTestRenderer.act(() => {
      buttons[0].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith('light');
  });
});
