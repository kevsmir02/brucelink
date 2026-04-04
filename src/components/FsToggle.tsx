import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import type { FileSystem } from '../types';
import { COLORS } from '../utils/constants';

interface FsToggleProps {
  fs: FileSystem;
  onSwitchFs: (fs: FileSystem) => void;
}

export function FsToggle({ fs, onSwitchFs }: FsToggleProps) {
  return (
    <View style={styles.fsToggle}>
      {(['SD', 'LittleFS'] as FileSystem[]).map(fileSystem => (
        <TouchableOpacity
          key={fileSystem}
          style={[styles.fsTab, fs === fileSystem && styles.fsTabActive]}
          onPress={() => onSwitchFs(fileSystem)}>
          <Text style={[styles.fsTabText, fs === fileSystem && styles.fsTabTextActive]}>
            {fileSystem}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fsToggle: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  fsTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fsTabActive: {
    backgroundColor: COLORS.primary,
  },
  fsTabText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  fsTabTextActive: {
    color: COLORS.background,
  },
});
