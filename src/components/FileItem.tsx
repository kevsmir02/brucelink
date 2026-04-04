import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { vibrate } from '../utils/vibrate';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FileEntry } from '../types';
import { COLORS } from '../utils/constants';
import { getFileIcon, isExecutable } from '../utils/fileHelpers';

interface Props {
  entry: FileEntry;
  onPress: () => void;
  onLongPress: () => void;
}

export function FileItem({ entry, onPress, onLongPress }: Props) {
  const isFolder = entry.type === 'folder';
  const iconName = getFileIcon(entry);
  const executable = !isFolder && isExecutable(entry.name);

  const handleLongPress = () => {
    vibrate(40);
    onLongPress();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}>
      <View style={[styles.iconWrap, isFolder ? styles.folderIcon : styles.fileIcon]}>
        <Icon
          name={iconName}
          size={22}
          color={isFolder ? COLORS.primary : COLORS.textMuted}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
        </Text>
        {!isFolder && entry.size ? (
          <Text style={styles.size}>{entry.size}</Text>
        ) : null}
      </View>
      {executable && (
        <View style={styles.execBadge}>
          <Text style={styles.execText}>RUN</Text>
        </View>
      )}
      {isFolder && (
        <Icon name="chevron-right" size={18} color={COLORS.border} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  folderIcon: {
    backgroundColor: 'rgba(155,81,224,0.12)',
  },
  fileIcon: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  info: {
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  size: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  execBadge: {
    backgroundColor: 'rgba(155,81,224,0.18)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryDim,
  },
  execText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
