import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../contexts/ThemeContext';
import { vibrate } from '../utils/vibrate';

interface ExplorerFabProps {
  open: boolean;
  bottom: number;
  onToggle: () => void;
  onUploadFile: () => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
}

export function ExplorerFab({
  open,
  bottom,
  onToggle,
  onUploadFile,
  onCreateFolder,
  onCreateFile,
}: ExplorerFabProps) {
  const theme = useTheme();
  const s = makeStyles(theme);

  return (
    <View style={[s.fab, { bottom }]}> 
      {open && (
        <View style={s.fabMenu}>
          <TouchableOpacity style={s.fabItem} onPress={onUploadFile}>
            <Icon name="upload-outline" size={20} color={theme.colors.primary} />
            <Text style={s.fabItemText}>Upload File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.fabItem} onPress={onCreateFolder}>
            <Icon name="folder-plus-outline" size={20} color={theme.colors.primary} />
            <Text style={s.fabItemText}>New Folder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.fabItem} onPress={onCreateFile}>
            <Icon name="file-plus-outline" size={20} color={theme.colors.primary} />
            <Text style={s.fabItemText}>New File</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={s.fabBtn}
        onPress={() => {
          vibrate(20);
          onToggle();
        }}
        activeOpacity={0.85}>
        <Icon name={open ? 'close' : 'plus'} size={26} color={theme.colors.background} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      right: 20,
      alignItems: 'flex-end',
    },
    fabBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
    },
    fabMenu: {
      marginBottom: 12,
      alignItems: 'flex-end',
    },
    fabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      elevation: 4,
    },
    fabItemText: {
      color: theme.colors.text,
      marginLeft: 10,
      fontSize: 14,
    },
  });
}
