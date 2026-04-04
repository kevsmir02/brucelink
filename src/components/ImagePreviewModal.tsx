import React from 'react';
import { Modal, TouchableOpacity, StyleSheet, Image, Text } from 'react-native';

import { COLORS } from '../utils/constants';

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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={onClose}>
        {previewUri && (
          <Image
            source={{
              uri: previewUri,
              headers: previewToken ? { Cookie: `BRUCESESSION=${previewToken}` } : undefined,
            }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        )}
        <Text style={styles.previewHint}>Tap to close</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    color: COLORS.textMuted,
    marginTop: 16,
    fontSize: 12,
  },
});
