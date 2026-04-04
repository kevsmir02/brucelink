import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../utils/constants';
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
  return (
    <View style={[styles.fab, { bottom }]}> 
      {open && (
        <View style={styles.fabMenu}>
          <TouchableOpacity style={styles.fabItem} onPress={onUploadFile}>
            <Icon name="upload-outline" size={20} color={COLORS.primary} />
            <Text style={styles.fabItemText}>Upload File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabItem} onPress={onCreateFolder}>
            <Icon name="folder-plus-outline" size={20} color={COLORS.primary} />
            <Text style={styles.fabItemText}>New Folder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabItem} onPress={onCreateFile}>
            <Icon name="file-plus-outline" size={20} color={COLORS.primary} />
            <Text style={styles.fabItemText}>New File</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => {
          vibrate(20);
          onToggle();
        }}
        activeOpacity={0.85}>
        <Icon name={open ? 'close' : 'plus'} size={26} color={COLORS.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
  },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
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
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
  },
  fabItemText: {
    color: COLORS.text,
    marginLeft: 10,
    fontSize: 14,
  },
});
