import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  ToastAndroid,
} from 'react-native';
import { vibrate } from '../utils/vibrate';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootStackParamList, FileEntry, FileSystem } from '../types';
import {
  listFiles,
  deleteFile,
  createFolder,
  createFile,
  renameFile,
  downloadFile,
  sendCommand,
} from '../services/api';
import { FileItem } from '../components/FileItem';
import { COLORS, STORAGE_KEYS } from '../utils/constants';
import {
  parentPath,
  formatBreadcrumbs,
  isExecutable,
  getExecuteCommand,
  isTextFile,
} from '../utils/fileHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'FileExplorer'>;

type ActionSheetEntry = FileEntry | null;

function ExplorerListHeader({
  fs,
  currentPath,
  breadcrumbs,
  error,
  onSwitchFs,
  onNavigateTo,
  onNavigateUp,
}: {
  fs: FileSystem;
  currentPath: string;
  breadcrumbs: Array<{ label: string; path: string }>;
  error: string | null;
  onSwitchFs: (f: FileSystem) => void;
  onNavigateTo: (path: string) => void;
  onNavigateUp: () => void;
}) {
  return (
    <>
      <View style={styles.fsToggle}>
        {(['SD', 'LittleFS'] as FileSystem[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.fsTab, fs === f && styles.fsTabActive]}
            onPress={() => onSwitchFs(f)}>
            <Text style={[styles.fsTabText, fs === f && styles.fsTabTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbScroll}>
        <View style={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <Text style={styles.crumbSep}>/</Text>}
              <TouchableOpacity onPress={() => onNavigateTo(crumb.path)}>
                <Text style={[styles.crumb, idx === breadcrumbs.length - 1 && styles.crumbActive]}>
                  {crumb.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {currentPath !== '/' && (
        <TouchableOpacity style={styles.upRow} onPress={onNavigateUp}>
          <Icon name="arrow-up" size={18} color={COLORS.primary} />
          <Text style={styles.upText}>..</Text>
        </TouchableOpacity>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </>
  );
}

export function FileExplorerScreen({ navigation, route }: Props) {
  const [fs, setFs] = useState<FileSystem>((route.params?.fs) ?? 'SD');
  const [currentPath, setCurrentPath] = useState(route.params?.folder ?? '/');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ActionSheetEntry>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const loadFiles = useCallback(async (targetFs: FileSystem, path: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await listFiles(targetFs, path);
      setEntries(data);
      await AsyncStorage.setItem(STORAGE_KEYS.lastFs, targetFs);
      await AsyncStorage.setItem(STORAGE_KEYS.lastPath, path);
    } catch {
      setError('Failed to list files. Check connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFiles(fs, currentPath);
    }, [fs, currentPath, loadFiles]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: currentPath === '/' ? `${fs} /` : currentPath.split('/').pop() });
  }, [navigation, currentPath, fs]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    navigateTo(parentPath(currentPath));
  };

  const switchFs = (newFs: FileSystem) => {
    setFs(newFs);
    setCurrentPath('/');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFiles(fs, currentPath);
    setRefreshing(false);
  };

  const openActionSheet = (entry: FileEntry) => {
    setSelectedEntry(entry);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedEntry(null);
  };

  const handleEntryPress = (entry: FileEntry) => {
    if (entry.type === 'folder') {
      navigateTo(entry.path);
    } else if (isTextFile(entry.name)) {
      navigation.navigate('FileEditor', { fs, filePath: entry.path });
    } else {
      openActionSheet(entry);
    }
  };

  // ----- Actions -----

  const handleDownload = async (entry: FileEntry) => {
    closeActionSheet();
    try {
      const dest = await downloadFile(fs, entry.path);
      ToastAndroid.show(`Saved to ${dest}`, ToastAndroid.LONG);
    } catch (err: any) {
      Alert.alert('Download Failed', err.message ?? 'Unknown error');
    }
  };

  const handleEdit = (entry: FileEntry) => {
    closeActionSheet();
    navigation.navigate('FileEditor', { fs, filePath: entry.path });
  };

  const handleRun = async (entry: FileEntry) => {
    closeActionSheet();
    const cmd = getExecuteCommand(entry.path);
    if (!cmd) return;
    try {
      const resp = await sendCommand(cmd);
      ToastAndroid.show(resp || 'Command sent', ToastAndroid.SHORT);
    } catch {
      Alert.alert('Error', 'Failed to send command');
    }
  };

  const handleRename = (entry: FileEntry) => {
    closeActionSheet();
    Alert.prompt(
      'Rename',
      `New name for "${entry.name}":`,
      async (newName) => {
        if (!newName || newName === entry.name) return;
        try {
          await renameFile(fs, entry.path, newName);
          loadFiles(fs, currentPath);
        } catch {
          Alert.alert('Error', 'Failed to rename');
        }
      },
      'plain-text',
      entry.name,
    );
  };

  const handleDelete = (entry: FileEntry) => {
    closeActionSheet();
    Alert.alert(
      'Delete',
      `Delete "${entry.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(fs, entry.path);
              loadFiles(fs, currentPath);
              ToastAndroid.show('Deleted', ToastAndroid.SHORT);
            } catch {
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ],
    );
  };

  // ----- FAB actions -----

  const handleCreateFolder = () => {
    setFabOpen(false);
    Alert.prompt('New Folder', 'Folder name:', async (name) => {
      if (!name) return;
      const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      try {
        await createFolder(fs, path);
        loadFiles(fs, currentPath);
      } catch {
        Alert.alert('Error', 'Failed to create folder');
      }
    });
  };

  const handleCreateFile = () => {
    setFabOpen(false);
    Alert.prompt('New File', 'File name:', async (name) => {
      if (!name) return;
      const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      try {
        await createFile(fs, path);
        loadFiles(fs, currentPath);
      } catch {
        Alert.alert('Error', 'Failed to create file');
      }
    });
  };

  // ----- Render helpers -----

  const breadcrumbs = formatBreadcrumbs(currentPath);

  const renderItem = ({ item }: { item: FileEntry }) => (
    <FileItem
      entry={item}
      onPress={() => handleEntryPress(item)}
      onLongPress={() => openActionSheet(item)}
    />
  );

  return (
    <View style={styles.root}>
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item, idx) => `${item.path}-${idx}`}
        renderItem={renderItem}
        ListHeaderComponent={
          <ExplorerListHeader
            fs={fs}
            currentPath={currentPath}
            breadcrumbs={breadcrumbs}
            error={error}
            onSwitchFs={switchFs}
            onNavigateTo={navigateTo}
            onNavigateUp={navigateUp}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Icon name="folder-open-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>Empty directory</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        style={styles.list}
      />

      {/* FAB */}
      <View style={styles.fab}>
        {fabOpen && (
          <View style={styles.fabMenu}>
            <TouchableOpacity style={styles.fabItem} onPress={handleCreateFolder}>
              <Icon name="folder-plus-outline" size={20} color={COLORS.primary} />
              <Text style={styles.fabItemText}>New Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabItem} onPress={handleCreateFile}>
              <Icon name="file-plus-outline" size={20} color={COLORS.primary} />
              <Text style={styles.fabItemText}>New File</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => { vibrate(20); setFabOpen(o => !o); }}
          activeOpacity={0.85}>
          <Icon name={fabOpen ? 'close' : 'plus'} size={26} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Action Sheet Modal */}
      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeActionSheet}>
        <TouchableOpacity style={styles.modalOverlay} onPress={closeActionSheet} activeOpacity={1}>
          <View style={styles.actionSheet}>
            <View style={styles.actionHandle} />
            <Text style={styles.actionTitle} numberOfLines={1}>
              {selectedEntry?.name}
            </Text>
            <Text style={styles.actionSubtitle}>
              {selectedEntry?.size || selectedEntry?.type}
            </Text>

            {selectedEntry?.type === 'file' && (
              <>
                <ActionRow icon="download-outline" label="Download" onPress={() => selectedEntry && handleDownload(selectedEntry)} />
                <ActionRow icon="pencil-outline" label="Edit" onPress={() => selectedEntry && handleEdit(selectedEntry)} />
                {selectedEntry && isExecutable(selectedEntry.name) && (
                  <ActionRow icon="play-outline" label="Run" accent onPress={() => selectedEntry && handleRun(selectedEntry)} />
                )}
              </>
            )}
            <ActionRow icon="form-textbox" label="Rename" onPress={() => selectedEntry && handleRename(selectedEntry)} />
            <ActionRow icon="delete-outline" label="Delete" danger onPress={() => selectedEntry && handleDelete(selectedEntry)} />

            <TouchableOpacity style={styles.cancelBtn} onPress={closeActionSheet}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
  accent,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
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
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fsToggle: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  fsTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fsTabActive: {
    backgroundColor: COLORS.primary,
  },
  fsTabText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  fsTabTextActive: {
    color: COLORS.background,
  },
  breadcrumbScroll: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  breadcrumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  crumb: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: 'Courier New',
  },
  crumbActive: {
    color: COLORS.primary,
  },
  crumbSep: {
    color: COLORS.border,
    marginHorizontal: 4,
    fontSize: 13,
  },
  upRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  upText: {
    color: COLORS.primary,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: 'Courier New',
  },
  errorBox: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.errorDim,
    margin: 16,
    padding: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
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
