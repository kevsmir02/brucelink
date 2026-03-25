import React, { useState, useCallback, useLayoutEffect, useEffect } from 'react';
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
  Image,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vibrate } from '../utils/vibrate';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  pick as pickDocument,
  types as documentTypes,
  errorCodes as documentPickerErrorCodes,
  isErrorWithCode as isDocumentPickerErrorWithCode,
} from '@react-native-documents/picker';

import { RootStackParamList, FileEntry, FileSystem } from '../types';
import {
  listFiles,
  deleteFile,
  createFolder,
  createFile,
  renameFile,
  downloadFile,
  uploadFile,
  sendCommand,
  getBaseUrl,
  getSessionToken,
} from '../services/api';
import { FileItem } from '../components/FileItem';
import { PromptModal } from '../components/PromptModal';
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

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];

function isImage(name: string): boolean {
  const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
  return IMAGE_EXTENSIONS.includes(ext);
}

function ExplorerListHeader({
  fs,
  currentPath,
  breadcrumbs,
  error,
  disconnected,
  onSwitchFs,
  onNavigateTo,
  onNavigateUp,
}: {
  fs: FileSystem;
  currentPath: string;
  breadcrumbs: Array<{ label: string; path: string }>;
  error: string | null;
  disconnected: boolean;
  onSwitchFs: (f: FileSystem) => void;
  onNavigateTo: (path: string) => void;
  onNavigateUp: () => void;
}) {
  return (
    <>
      {disconnected && (
        <View style={styles.disconnectBanner}>
          <Icon name="wifi-off" size={14} color={COLORS.warning} />
          <Text style={styles.disconnectText}>
            Not connected to Bruce AP. Connect to BruceNet and refresh.
          </Text>
        </View>
      )}

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
  const insets = useSafeAreaInsets();
  const [fs, setFs] = useState<FileSystem>(route.params?.fs ?? 'SD');
  const [currentPath, setCurrentPath] = useState(route.params?.folder ?? '/');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ActionSheetEntry>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  // Prompt modal state (Alert.prompt is not available on Android)
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    title: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void;
  } | null>(null);

  const showPrompt = (config: typeof promptConfig) => {
    setPromptConfig(config);
    setPromptVisible(true);
  };
  const hidePrompt = () => {
    setPromptVisible(false);
    setPromptConfig(null);
  };

  // Restore last visited path/FS when opened without route params
  useEffect(() => {
    if (!route.params?.fs && !route.params?.folder) {
      AsyncStorage.multiGet([STORAGE_KEYS.lastFs, STORAGE_KEYS.lastPath]).then(pairs => {
        const storedFs = pairs[0][1] as FileSystem | null;
        const storedPath = pairs[1][1];
        if (storedFs) setFs(storedFs);
        if (storedPath) setCurrentPath(storedPath);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFiles = useCallback(async (targetFs: FileSystem, path: string) => {
    setError(null);
    setDisconnected(false);
    setLoading(true);
    try {
      const data = await listFiles(targetFs, path);
      setEntries(data);
      await AsyncStorage.setItem(STORAGE_KEYS.lastFs, targetFs);
      await AsyncStorage.setItem(STORAGE_KEYS.lastPath, path);
    } catch (err: any) {
      const isNetworkError =
        err.code === 'ECONNABORTED' ||
        err.message?.includes('Network Error') ||
        err.message?.includes('unreachable');
      if (isNetworkError) {
        setDisconnected(true);
      }
      setError('Failed to list files. Check connection to BruceNet.');
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
    navigation.setOptions({
      title: currentPath === '/' ? `${fs} /` : currentPath.split('/').pop(),
    });
  }, [navigation, currentPath, fs]);

  const navigateTo = (path: string) => setCurrentPath(path);
  const navigateUp = () => {
    if (currentPath !== '/') navigateTo(parentPath(currentPath));
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
    } else if (isImage(entry.name)) {
      openActionSheet(entry);
    } else if (isTextFile(entry.name)) {
      navigation.navigate('FileEditor', { fs, filePath: entry.path });
    } else {
      openActionSheet(entry);
    }
  };

  // ----- File actions -----

  const handleDownload = async (entry: FileEntry) => {
    closeActionSheet();
    setDownloadingPath(entry.path);
    try {
      const dest = await downloadFile(fs, entry.path);
      ToastAndroid.show(`Saved to ${dest}`, ToastAndroid.LONG);
    } catch (err: any) {
      Alert.alert('Download Failed', err.message ?? 'Unknown error');
    } finally {
      setDownloadingPath(null);
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

  const handlePreviewImage = async (entry: FileEntry) => {
    closeActionSheet();
    const url = `${getBaseUrl()}/file?fs=${fs}&name=${encodeURIComponent(entry.path)}&action=image`;
    const token = await getSessionToken();
    setPreviewUri(url);
    setPreviewToken(token);
    setPreviewVisible(true);
  };

  const handleRename = (entry: FileEntry) => {
    closeActionSheet();
    showPrompt({
      title: `Rename "${entry.name}"`,
      defaultValue: entry.name,
      placeholder: 'New name',
      confirmLabel: 'Rename',
      onConfirm: async (newName) => {
        hidePrompt();
        if (newName === entry.name) return;
        try {
          await renameFile(fs, entry.path, newName);
          loadFiles(fs, currentPath);
        } catch {
          Alert.alert('Error', 'Failed to rename');
        }
      },
    });
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

  const handleUploadFile = async () => {
    setFabOpen(false);
    try {
      const [result] = await pickDocument({
        type: [documentTypes.allFiles],
      });
      const { uri } = result;
      if (!uri) return;
      const fromUri =
        decodeURIComponent((uri.split('/').pop() ?? '').split('?')[0]).replace(/\+/g, ' ') ||
        'upload.bin';
      const name = result.name ?? fromUri;
      setUploadProgress(0);
      await uploadFile(fs, currentPath, uri, name, (pct) => setUploadProgress(pct));
      setUploadProgress(null);
      ToastAndroid.show('Upload complete', ToastAndroid.SHORT);
      loadFiles(fs, currentPath);
    } catch (err: unknown) {
      setUploadProgress(null);
      if (
        isDocumentPickerErrorWithCode(err) &&
        err.code === documentPickerErrorCodes.OPERATION_CANCELED
      ) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Upload Failed', message);
    }
  };

  const handleCreateFolder = () => {
    setFabOpen(false);
    showPrompt({
      title: 'New Folder',
      placeholder: 'Folder name',
      confirmLabel: 'Create',
      onConfirm: async (name) => {
        hidePrompt();
        const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        try {
          await createFolder(fs, path);
          loadFiles(fs, currentPath);
        } catch {
          Alert.alert('Error', 'Failed to create folder');
        }
      },
    });
  };

  const handleCreateFile = () => {
    setFabOpen(false);
    showPrompt({
      title: 'New File',
      placeholder: 'File name',
      confirmLabel: 'Create',
      onConfirm: async (name) => {
        hidePrompt();
        const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        try {
          await createFile(fs, path);
          loadFiles(fs, currentPath);
        } catch {
          Alert.alert('Error', 'Failed to create file');
        }
      },
    });
  };

  const handleQuickDelete = (entry: FileEntry) => {
    Alert.alert('Delete', `Delete "${entry.name}"?\nThis cannot be undone.`, [
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
    ]);
  };

  const breadcrumbs = formatBreadcrumbs(currentPath);

  const renderItem = ({ item }: { item: FileEntry }) => (
    <FileRowWithDelete
      entry={item}
      onPress={() => handleEntryPress(item)}
      onLongPress={() => openActionSheet(item)}
      onDelete={() => handleQuickDelete(item)}
    />
  );

  return (
    <View style={styles.root}>
      {/* Upload progress overlay */}
      {uploadProgress !== null && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <Icon name="upload" size={24} color={COLORS.primary} />
            <Text style={styles.uploadLabel}>Uploading... {uploadProgress}%</Text>
            <View style={styles.uploadTrack}>
              <View style={[styles.uploadFill, { width: `${uploadProgress}%` as any }]} />
            </View>
          </View>
        </View>
      )}

      {/* Download spinner overlay */}
      {downloadingPath !== null && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.uploadLabel}>Downloading…</Text>
          </View>
        </View>
      )}

      {loading && !refreshing && !uploadProgress && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item, idx) => `${item.path}-${idx}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 92 }}
        ListHeaderComponent={
          <ExplorerListHeader
            fs={fs}
            currentPath={currentPath}
            breadcrumbs={breadcrumbs}
            error={error}
            disconnected={disconnected}
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
      <View style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 12 }]}>
        {fabOpen && (
          <View style={styles.fabMenu}>
            <TouchableOpacity style={styles.fabItem} onPress={handleUploadFile}>
              <Icon name="upload-outline" size={20} color={COLORS.primary} />
              <Text style={styles.fabItemText}>Upload File</Text>
            </TouchableOpacity>
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
          <View style={[styles.actionSheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
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
                {selectedEntry && isImage(selectedEntry.name) && (
                  <ActionRow icon="image-outline" label="Preview Image" onPress={() => selectedEntry && handlePreviewImage(selectedEntry)} />
                )}
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

      {/* Image Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}>
        <TouchableOpacity
          style={styles.previewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewVisible(false)}>
          {previewUri && (
            <Image
              source={{
                uri: previewUri,
                headers: previewToken
                  ? { Cookie: `BRUCESESSION=${previewToken}` }
                  : undefined,
              }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.previewHint}>Tap to close</Text>
        </TouchableOpacity>
      </Modal>

      {/* Prompt modal (Alert.prompt is not available on Android) */}
      {promptConfig && (
        <PromptModal
          visible={promptVisible}
          title={promptConfig.title}
          defaultValue={promptConfig.defaultValue}
          placeholder={promptConfig.placeholder}
          confirmLabel={promptConfig.confirmLabel}
          onConfirm={promptConfig.onConfirm}
          onCancel={hidePrompt}
        />
      )}
    </View>
  );
}

// ----- File row with inline delete button -----
// Replacing the old SwipeableFileItem whose long-press-to-swipe gesture
// conflicted with the FileItem's own long-press (action sheet).
// Now: row long-press → action sheet (single responsibility).
// Quick delete is accessible via the action sheet "Delete" row, or via the
// trash icon that slides in when the row is swiped using Animated.
function FileRowWithDelete({
  entry,
  onPress,
  onLongPress,
  onDelete,
}: {
  entry: FileEntry;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
}) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [revealed, setRevealed] = React.useState(false);

  const reveal = () => {
    Animated.spring(translateX, {
      toValue: revealed ? 0 : -72,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    setRevealed(r => !r);
  };

  // Close the revealed state when the user taps elsewhere (via onPress)
  const handlePress = () => {
    if (revealed) {
      reveal();
    } else {
      onPress();
    }
  };

  return (
    <View style={styles.swipeRow}>
      {/* Delete button sits behind, revealed by the slide */}
      <View style={styles.swipeAction}>
        <TouchableOpacity
          style={styles.swipeDeleteBtn}
          onPress={() => { reveal(); onDelete(); }}>
          <Icon name="delete-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Slide handle + file row */}
      <Animated.View style={[styles.swipeContent, { transform: [{ translateX }] }]}>
        {/* Swipe handle — separate from the file row so long-press is unambiguous */}
        <TouchableOpacity style={styles.swipeHandle} onPress={reveal} activeOpacity={0.6}>
          <Icon name="drag-horizontal-variant" size={16} color={COLORS.border} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <FileItem entry={entry} onPress={handlePress} onLongPress={onLongPress} />
        </View>
      </Animated.View>
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
  disconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,170,0,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warning,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  disconnectText: {
    color: COLORS.warning,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
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
  // Upload / download overlays
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  uploadCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 1,
    borderColor: COLORS.primaryDim,
  },
  uploadLabel: {
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  uploadTrack: {
    width: 160,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  // FAB
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
  // Action sheet
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
  dangerText: { color: COLORS.error },
  accentText: { color: COLORS.primary },
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
  // Image preview
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
  // Swipe row
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
});
