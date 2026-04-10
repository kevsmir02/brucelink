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
import { useTheme } from '../contexts/ThemeContext';
import { getFileIcon, isExecutable } from '../utils/fileHelpers';

interface Props {
  entry: FileEntry;
  onPress: () => void;
  onLongPress: () => void;
}

export function FileItem({ entry, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const isFolder = entry.type === 'folder';
  const iconName = getFileIcon(entry);
  const executable = !isFolder && isExecutable(entry.name);

  const handleLongPress = () => {
    vibrate(40);
    onLongPress();
  };

  return (
    <TouchableOpacity
      style={s.container}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}>
      <View style={[s.iconWrap, isFolder ? s.folderIcon : s.fileIcon]}>
        <Icon
          name={iconName}
          size={22}
          color={isFolder ? theme.colors.primary : theme.colors.textMuted}
        />
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>
          {entry.name}
        </Text>
        {!isFolder && entry.size ? (
          <Text style={s.size}>{entry.size}</Text>
        ) : null}
      </View>
      {executable && (
        <View style={s.execBadge}>
          <Text style={s.execText}>RUN</Text>
        </View>
      )}
      {isFolder && (
        <Icon name="chevron-right" size={18} color={theme.colors.border} />
      )}
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
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
      backgroundColor: theme.colors.surfaceAlt,
    },
    info: {
      flex: 1,
    },
    name: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '500',
    },
    size: {
      color: theme.colors.textMuted,
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
      borderColor: theme.colors.primaryStrong,
    },
    execText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
    },
  });
}
