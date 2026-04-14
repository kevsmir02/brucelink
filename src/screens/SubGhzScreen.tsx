import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ToastAndroid,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList, FileEntry } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { DeviceScreenBuffer, DeviceScreenBufferRef } from '../components/DeviceScreenBuffer';
import { sendCommand } from '../services/api';
import { useFileList } from '../hooks/useFileList';
import { FileRowWithDelete } from '../components/FileRowWithDelete';

type Props = NativeStackScreenProps<RootStackParamList, 'SubGhz'>;

export function SubGhzScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);

  const bufRef = useRef<DeviceScreenBufferRef>(null);
  const [busy, setBusy] = useState(false);

  // File explorer for /subghz
  const folderPath = '/subghz';
  const { entries, isLoading, error, refetch, deleteFile, isRefetching } = useFileList('SD', folderPath);
  
  // Only show .sub files
  const subFiles = entries.filter((e: FileEntry) => e.type === 'file' && e.name.endsWith('.sub'));

  const handleTransmit = async (entry: FileEntry) => {
    setBusy(true);
    try {
      const res = await sendCommand(`subghz tx_from_file "${entry.path}"`);
      ToastAndroid.show(res || 'Transmitting...', ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show('Transmit failed', ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (entry: FileEntry) => {
    try {
      await deleteFile(entry.path);
      ToastAndroid.show('Deleted', ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show('Failed to delete', ToastAndroid.SHORT);
    }
  };

  const execNav = async (cmd: string) => {
    try {
      await sendCommand(cmd);
      await new Promise(r => setTimeout(r, 200));
      bufRef.current?.refresh();
      bufRef.current?.setAutoReload(500);
      setTimeout(() => bufRef.current?.setAutoReload(2000), 1000);
    } catch { /* ignore */ }
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      
      {busy && (
        <View style={s.busyRow}>
          <ActivityIndicator color={theme.colors.primary} size="small" />
          <Text style={s.busyText}>Executing...</Text>
        </View>
      )}

      {/* SAVED SIGNALS */}
      <View style={s.headerRow}>
         <SectionHeader title="SAVED SIGNALS" icon="radio-tower" theme={theme} s={s} />
         <TouchableOpacity
           style={s.refreshBtn}
           onPress={() => refetch()}
           disabled={isLoading || isRefetching}>
           <Icon name="refresh" size={16} color={theme.colors.primary} />
         </TouchableOpacity>
      </View>

      <View style={s.filesContainer}>
        {isLoading && !isRefetching ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : error ? (
          <Text style={s.errorText}>Could not load saved signals.</Text>
        ) : subFiles.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No .sub files found in /subghz on SD card.</Text>
          </View>
        ) : (
          subFiles.map((item) => (
            <FileRowWithDelete
              key={item.path}
              entry={item}
              onPress={() => handleTransmit(item)}
              onLongPress={() => {}}
              onDelete={() => handleDelete(item)}
            />
          ))
        )}
      </View>

      <TouchableOpacity 
        style={s.browseBtn}
        onPress={() => _props.navigation.navigate('FileExplorer', { fs: 'SD', folder: folderPath })}>
        <Icon name="folder-open" size={18} color={theme.colors.primary} />
        <Text style={s.browseBtnText}>Open File Explorer</Text>
      </TouchableOpacity>

      <DeviceScreenBuffer ref={bufRef} defaultAutoReloadMs={2000} />

      {/* D-PAD */}
      <SectionHeader title="MANUAL CONTROL" icon="gamepad" theme={theme} s={s} />
      <View style={s.dpadContainer}>
        <View style={s.dpadRow}>
          <NavButton icon="arrow-u-left-top" label="Esc" onPress={() => execNav('nav esc')} />
          <NavButton icon="chevron-up" label="Up" onPress={() => execNav('nav up')} />
          <NavButton icon="refresh" label="Refresh" onPress={() => bufRef.current?.refresh()} />
        </View>
        <View style={s.dpadRow}>
          <NavButton icon="chevron-left" label="Prev" onPress={() => execNav('nav prev')} />
          <NavButton icon="circle-slice-8" label="Select" onPress={() => execNav('nav sel')} isCenter />
          <NavButton icon="chevron-right" label="Next" onPress={() => execNav('nav next')} />
        </View>
        <View style={s.dpadRow}>
          <View style={s.navBtnEmpty} />
          <NavButton icon="chevron-down" label="Down" onPress={() => execNav('nav down')} />
          <View style={s.navBtnEmpty} />
        </View>
      </View>

    </ScrollView>
  );
}

function SectionHeader({ title, icon, theme, s }: any) {
  return (
    <View style={[s.sectionHeader, { marginTop: 0 }]}>
      <Icon name={icon} size={14} color={theme.colors.primary} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function NavButton({ icon, label, onPress, disabled, isCenter }: any) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <TouchableOpacity
      style={[s.navBtn, isCenter && s.navBtnCenter, disabled && s.navBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}>
      <Icon
        name={icon}
        size={isCenter ? 32 : 24}
        color={disabled ? theme.colors.border : isCenter ? theme.colors.primary : theme.colors.text}
      />
      <Text style={[s.navBtnLabel, isCenter && s.navBtnLabelCenter]}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.md },
    busyRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.colors.surface, padding: 10,
      borderRadius: theme.radius.sm, marginBottom: 16,
    },
    busyText: { color: theme.colors.textMuted, fontSize: 13 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 20, marginBottom: theme.spacing.md,
    },
    refreshBtn: {
      padding: 4,
      marginRight: 4,
    },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginLeft: 4,
    },
    sectionTitle: {
      color: theme.colors.textMuted, fontSize: 11,
      fontWeight: '700', letterSpacing: 1.5,
    },
    filesContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      marginBottom: 12,
      maxHeight: 250, // Keep it compact
    },
    emptyBox: {
      padding: 24, alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.textMuted, fontSize: 13, textAlign: 'center',
    },
    errorText: {
      color: theme.colors.error, fontSize: 13, padding: 16, textAlign: 'center',
    },
    browseBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
      borderRadius: theme.radius.md, padding: 14, marginBottom: 20,
    },
    browseBtnText: {
      color: theme.colors.text, fontSize: 14, fontWeight: '600',
    },
    dpadContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    dpadRow: {
      flexDirection: 'row', justifyContent: 'center', marginBottom: 8,
    },
    navBtn: {
      width: 70, height: 70, backgroundColor: theme.colors.background,
      justifyContent: 'center', alignItems: 'center', borderRadius: theme.radius.sm,
      marginHorizontal: 4, borderWidth: 1, borderColor: theme.colors.border,
    },
    navBtnCenter: {
      borderColor: theme.colors.primary, borderWidth: 2,
    },
    navBtnDisabled: { opacity: 0.5 },
    navBtnLabel: { color: theme.colors.textMuted, fontSize: 10, marginTop: 4 },
    navBtnLabelCenter: { color: theme.colors.primary, fontWeight: '600' },
    navBtnEmpty: { width: 70, marginHorizontal: 4 },
  });
}
