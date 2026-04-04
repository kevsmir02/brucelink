import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import type { FileEntry } from '../types';
import { COLORS } from '../utils/constants';
import { isExecutable } from '../utils/fileHelpers';

interface FileActionSheetProps {
  visible: boolean;
  entry: FileEntry | null;
  bottomInset: number;
  onClose: () => void;
  onDownload: (entry: FileEntry) => void;
  onEdit: (entry: FileEntry) => void;
  onPreviewImage: (entry: FileEntry) => void;
  onRun: (entry: FileEntry) => void;
  onRename: (entry: FileEntry) => void;
  onDelete: (entry: FileEntry) => void;
  isImageFile: (name: string) => boolean;
}

export function FileActionSheet({
  visible,
  entry,
  bottomInset,
  onClose,
  onDownload,
  onEdit,
  onPreviewImage,
  onRun,
  onRename,
  onDelete,
  isImageFile,
}: FileActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.actionSheet, { paddingBottom: Math.max(bottomInset, 16) + 16 }]}> 
          <View style={styles.actionHandle} />
          <Text style={styles.actionTitle} numberOfLines={1}>
            {entry?.name}
          </Text>
          <Text style={styles.actionSubtitle}>{entry?.size || entry?.type}</Text>

          {entry?.type === 'file' && (
            <>
              <ActionRow icon="download-outline" label="Download" onPress={() => onDownload(entry)} />
              <ActionRow icon="pencil-outline" label="Edit" onPress={() => onEdit(entry)} />
              {isImageFile(entry.name) && (
                <ActionRow
                  icon="image-outline"
                  label="Preview Image"
                  onPress={() => onPreviewImage(entry)}
                />
              )}
              {isExecutable(entry.name) && (
                <ActionRow icon="play-outline" label="Run" accent onPress={() => onRun(entry)} />
              )}
            </>
          )}

          {entry && <ActionRow icon="form-textbox" label="Rename" onPress={() => onRename(entry)} />}
          {entry && (
            <ActionRow icon="delete-outline" label="Delete" danger onPress={() => onDelete(entry)} />
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

interface ActionRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  accent?: boolean;
}

function ActionRow({ icon, label, onPress, danger, accent }: ActionRowProps) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
      <Icon
        name={icon}
        size={22}
        color={danger ? COLORS.error : accent ? COLORS.primary : COLORS.text}
      />
      <Text style={[styles.actionRowText, danger && styles.dangerText, accent && styles.accentText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Courier New',
  },
  actionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionRowText: {
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 14,
  },
  dangerText: {
    color: COLORS.error,
  },
  accentText: {
    color: COLORS.primary,
  },
  cancelBtn: {
    marginTop: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
