import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import type { FileEntry } from '../types';
import { useTheme } from '../contexts/ThemeContext';
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
  const theme = useTheme();
  const s = makeStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[s.actionSheet, { paddingBottom: Math.max(bottomInset, 16) + 16 }]}> 
          <View style={s.actionHandle} />
          <Text style={s.actionTitle} numberOfLines={1}>
            {entry?.name}
          </Text>
          <Text style={s.actionSubtitle}>{entry?.size || entry?.type}</Text>

          {entry?.type === 'file' && (
            <>
              <ActionRow icon="download-outline" label="Download" s={s} onPress={() => onDownload(entry)} />
              <ActionRow icon="pencil-outline" label="Edit" s={s} onPress={() => onEdit(entry)} />
              {isImageFile(entry.name) && (
                <ActionRow
                  icon="image-outline"
                  label="Preview Image"
                  s={s}
                  onPress={() => onPreviewImage(entry)}
                />
              )}
              {isExecutable(entry.name) && (
                <ActionRow icon="play-outline" label="Run" accent s={s} onPress={() => onRun(entry)} />
              )}
            </>
          )}

          {entry && <ActionRow icon="form-textbox" label="Rename" s={s} onPress={() => onRename(entry)} />}
          {entry && (
            <ActionRow icon="delete-outline" label="Delete" danger s={s} onPress={() => onDelete(entry)} />
          )}

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

type Styles = ReturnType<typeof makeStyles>;

interface ActionRowProps {
  icon: string;
  label: string;
  s: Styles;
  onPress: () => void;
  danger?: boolean;
  accent?: boolean;
}

function ActionRow({ icon, label, s, onPress, danger, accent }: ActionRowProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={s.actionRow} onPress={onPress} activeOpacity={0.7}>
      <Icon
        name={icon}
        size={22}
        color={danger ? theme.colors.error : accent ? theme.colors.primary : theme.colors.text}
      />
      <Text style={[s.actionRowText, danger && s.dangerText, accent && s.accentText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    actionSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
      paddingTop: 12,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    actionTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      fontFamily: 'Courier New',
    },
    actionSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginBottom: 16,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionRowText: {
      color: theme.colors.text,
      fontSize: 16,
      marginLeft: 14,
    },
    dangerText: {
      color: theme.colors.error,
    },
    accentText: {
      color: theme.colors.primary,
    },
    cancelBtn: {
      marginTop: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelText: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
