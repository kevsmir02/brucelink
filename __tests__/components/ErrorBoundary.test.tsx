import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

import { ErrorBoundary } from '../../src/components/ErrorBoundary.tsx';
import { ThemeProvider } from '../../src/contexts/ThemeContext';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders fallback UI when a child throws', () => {
    function Bomb(): never {
      throw new Error('boom');
    }

    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <ErrorBoundary>
            <Bomb />
          </ErrorBoundary>
        </ThemeProvider>,
      );
    });

    const allText = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(allText.join(' ')).toContain('Something went wrong');
  });

  it('recovers after pressing retry', () => {
    let shouldThrow = true;

    function Flaky() {
      if (shouldThrow) {
        throw new Error('broken');
      }
      return <Text>Recovered</Text>;
    }

    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <ErrorBoundary>
            <Flaky />
          </ErrorBoundary>
        </ThemeProvider>,
      );
    });

    const retryButton = renderer!.root.findAllByType(TouchableOpacity)[0];
    shouldThrow = false;

    ReactTestRenderer.act(() => {
      retryButton.props.onPress();
    });

    const textValues = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(textValues.join(' ')).toContain('Recovered');
  });
});
