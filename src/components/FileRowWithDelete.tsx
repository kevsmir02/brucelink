import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import type { FileEntry } from '../types';
import { COLORS } from '../utils/constants';
import { FileItem } from './FileItem';

interface FileRowWithDeleteProps {
  entry: FileEntry;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
}

export function FileRowWithDelete({
  entry,
  onPress,
  onLongPress,
  onDelete,
}: FileRowWithDeleteProps) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [revealed, setRevealed] = React.useState(false);

  const reveal = () => {
    Animated.spring(translateX, {
      toValue: revealed ? 0 : -72,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    setRevealed(current => !current);
  };

  const handlePress = () => {
    if (revealed) {
      reveal();
      return;
    }
    onPress();
  };

  return (
    <View style={styles.swipeRow}>
      <View style={styles.swipeAction}>
        <TouchableOpacity
          style={styles.swipeDeleteBtn}
          onPress={() => {
            reveal();
            onDelete();
          }}>
          <Icon name="delete-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.swipeContent, { transform: [{ translateX }] }]}>
        <TouchableOpacity style={styles.swipeHandle} onPress={reveal} activeOpacity={0.6}>
          <Icon name="drag-horizontal-variant" size={16} color={COLORS.border} />
        </TouchableOpacity>
        <View style={styles.fileCell}>
          <FileItem entry={entry} onPress={handlePress} onLongPress={onLongPress} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeRow: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 72,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
  },
  swipeContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.background,
  },
  swipeHandle: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  fileCell: {
    flex: 1,
  },
});
