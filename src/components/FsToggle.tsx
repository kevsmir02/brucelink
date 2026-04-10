import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import type { FileSystem } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface FsToggleProps {
  fs: FileSystem;
  onSwitchFs: (fs: FileSystem) => void;
}

export function FsToggle({ fs, onSwitchFs }: FsToggleProps) {
  const theme = useTheme();
  const s = makeStyles(theme);

  return (
    <View style={s.fsToggle}>
      {(['SD', 'LittleFS'] as FileSystem[]).map(fileSystem => (
        <TouchableOpacity
          key={fileSystem}
          style={[s.fsTab, fs === fileSystem && s.fsTabActive]}
          onPress={() => onSwitchFs(fileSystem)}>
          <Text style={[s.fsTabText, fs === fileSystem && s.fsTabTextActive]}>
            {fileSystem}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    fsToggle: {
      flexDirection: 'row',
      margin: 16,
      marginBottom: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    fsTab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    fsTabActive: {
      backgroundColor: theme.colors.primary,
    },
    fsTabText: {
      color: theme.colors.textMuted,
      fontWeight: '600',
      fontSize: 14,
    },
    fsTabTextActive: {
      color: theme.colors.background,
    },
  });
}
