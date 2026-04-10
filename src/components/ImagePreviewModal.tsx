import React from 'react';
import { Modal, TouchableOpacity, StyleSheet, Image, Text } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';

interface ImagePreviewModalProps {
  visible: boolean;
  previewUri: string | null;
  previewToken: string | null;
  onClose: () => void;
}

export function ImagePreviewModal({
  visible,
  previewUri,
  previewToken,
  onClose,
}: ImagePreviewModalProps) {
  const theme = useTheme();
  const s = makeStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.previewOverlay} activeOpacity={1} onPress={onClose}>
        {previewUri && (
          <Image
            source={{
              uri: previewUri,
              headers: previewToken ? { Cookie: `BRUCESESSION=${previewToken}` } : undefined,
            }}
            style={s.previewImage}
            resizeMode="contain"
          />
        )}
        <Text style={s.previewHint}>Tap to close</Text>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    previewOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewImage: {
      width: '90%',
      height: '80%',
    },
    previewHint: {
      color: theme.colors.textMuted,
      marginTop: 16,
      fontSize: 12,
    },
  });
}
