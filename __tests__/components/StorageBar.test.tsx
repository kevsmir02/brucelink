import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';

import { StorageBar, parseSize } from '../../src/components/StorageBar';

describe('StorageBar', () => {
  it('parses sizes from firmware output', () => {
    expect(parseSize('1.23 MB')).toBeCloseTo(1.23 * 1024 * 1024, 0);
    expect(parseSize('500 kB')).toBe(500 * 1024);
    expect(parseSize('2.5 GB')).toBeCloseTo(2.5 * 1024 * 1024 * 1024, 0);
  });

  it('renders usage and free labels', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StorageBar
          label="SD"
          info={{
            used: '500 kB',
            total: '2.0 MB',
            free: '1.5 MB',
          }}
        />,
      );
    });

    const text = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    const allText = text.join(' ');
    expect(allText).toContain('500 kB');
    expect(allText).toContain('1.5 MB');
    expect(allText).toContain('free');
  });
});
