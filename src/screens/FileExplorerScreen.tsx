import React, { useState, useLayoutEffect, useEffect } from 'react';
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
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
  downloadFile,
  sendCommand,
  getImagePreviewUrl,
  getSessionToken,
} from '../services/api';
import { useFileList } from '../hooks/useFileList';
import { PromptModal } from '../components/PromptModal';
import { STORAGE_KEYS } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';
import {
  parentPath,
  formatBreadcrumbs,
  getExecuteCommand,
  isTextFile,
} from '../utils/fileHelpers';
import { FsToggle } from '../components/FsToggle';
import { ExplorerFab } from '../components/ExplorerFab';
import { FileActionSheet } from '../components/FileActionSheet';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { FileRowWithDelete } from '../components/FileRowWithDelete';

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
  theme,
  s,
}: {
  fs: FileSystem;
  currentPath: string;
  breadcrumbs: Array<{ label: string; path: string }>;
  error: string | null;
  disconnected: boolean;
  onSwitchFs: (f: FileSystem) => void;
  onNavigateTo: (path: string) => void;
  onNavigateUp: () => void;
  theme: ReturnType<typeof useTheme>;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <>
      {disconnected && (
        <View style={s.disconnectBanner}>
          <Icon name="wifi-off" size={14} color={theme.colors.warning} />
          <Text style={s.disconnectText}>
            Not connected to Bruce AP. Connect to BruceNet and refresh.
          </Text>
        </View>
      )}

      <FsToggle fs={fs} onSwitchFs={onSwitchFs} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.breadcrumbScroll}>
        <View style={s.breadcrumbs}>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <Text style={s.crumbSep}>/</Text>}
              <TouchableOpacity onPress={() => onNavigateTo(crumb.path)}>
                <Text style={[s.crumb, idx === breadcrumbs.length - 1 && s.crumbActive]}>
                  {crumb.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {currentPath !== '/' && (
        <TouchableOpacity style={s.upRow} onPress={onNavigateUp}>
          <Icon name="arrow-up" size={18} color={theme.colors.primary} />
          <Text style={s.upText}>..</Text>
        </TouchableOpacity>
      )}

      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}
    </>
  );
}

export function FileExplorerScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);
  const [fs, setFs] = useState<FileSystem>(route.params?.fs ?? 'SD');
  const [currentPath, setCurrentPath] = useState(route.params?.folder ?? '/');
  const {
    entries,
    isLoading: loading,
    isRefetching: refreshing,
    isDisconnected: disconnected,
    error,
    refetch,
    deleteFile: doDeleteFile,
    renameFile: doRenameFile,
    createFolder: doCreateFolder,
    createFile: doCreateFile,
    uploadFile: doUploadFile,
  } = useFileList(fs, currentPath);

  // UI-only state — has no caching need, lives locally in the screen
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
    const url = getImagePreviewUrl(fs, entry.path);
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
          await doRenameFile({ filePath: entry.path, newName });
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
              await doDeleteFile(entry.path);
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
      await doUploadFile({ fileUri: uri, fileName: name, onProgress: (pct) => setUploadProgress(pct) });
      setUploadProgress(null);
      ToastAndroid.show('Upload complete', ToastAndroid.SHORT);
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
          await doCreateFolder(path);
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
          await doCreateFile(path);
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
            await doDeleteFile(entry.path);
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
    <View style={s.root}>
      {/* Upload progress overlay */}
      {uploadProgress !== null && (
        <View style={s.uploadOverlay}>
          <View style={s.uploadCard}>
            <Icon name="upload" size={24} color={theme.colors.primary} />
            <Text style={s.uploadLabel}>Uploading... {uploadProgress}%</Text>
            <View style={s.uploadTrack}>
              <View style={[s.uploadFill, { width: `${uploadProgress}%` as any }]} />
            </View>
          </View>
        </View>
      )}

      {/* Download spinner overlay */}
      {downloadingPath !== null && (
        <View style={s.uploadOverlay}>
          <View style={s.uploadCard}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={s.uploadLabel}>Downloading…</Text>
          </View>
        </View>
      )}

      {loading && !refreshing && !uploadProgress && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
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
            theme={theme}
            s={s}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Icon name="folder-open-outline" size={48} color={theme.colors.border} />
              <Text style={s.emptyText}>Empty directory</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        style={s.list}
      />

      <ExplorerFab
        open={fabOpen}
        bottom={Math.max(insets.bottom, 12) + 12}
        onToggle={() => setFabOpen(current => !current)}
        onUploadFile={handleUploadFile}
        onCreateFolder={handleCreateFolder}
        onCreateFile={handleCreateFile}
      />

      <FileActionSheet
        visible={actionSheetVisible}
        entry={selectedEntry}
        bottomInset={insets.bottom}
        onClose={closeActionSheet}
        onDownload={handleDownload}
        onEdit={handleEdit}
        onPreviewImage={handlePreviewImage}
        onRun={handleRun}
        onRename={handleRename}
        onDelete={handleDelete}
        isImageFile={isImage}
      />

      <ImagePreviewModal
        visible={previewVisible}
        previewUri={previewUri}
        previewToken={previewToken}
        onClose={() => setPreviewVisible(false)}
      />

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

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
      borderBottomColor: theme.colors.warning,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    disconnectText: {
      color: theme.colors.warning,
      fontSize: 12,
      flex: 1,
      lineHeight: 16,
    },
    breadcrumbScroll: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: 4,
    },
    breadcrumbs: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    crumb: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontFamily: theme.typography.mono,
    },
    crumbActive: {
      color: theme.colors.primary,
    },
    crumbSep: {
      color: theme.colors.border,
      marginHorizontal: 4,
      fontSize: 13,
    },
    upRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    upText: {
      color: theme.colors.primary,
      marginLeft: 10,
      fontSize: 15,
      fontFamily: theme.typography.mono,
    },
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.1)',
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
      margin: theme.spacing.md,
      padding: 12,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 13,
    },
    empty: {
      alignItems: 'center',
      marginTop: 60,
    },
    emptyText: {
      color: theme.colors.textMuted,
      marginTop: 12,
      fontSize: 15,
    },
    uploadOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(10,10,10,0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    },
    uploadCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 28,
      alignItems: 'center',
      minWidth: 200,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    uploadLabel: {
      color: theme.colors.text,
      marginTop: 12,
      marginBottom: 12,
      fontSize: 14,
    },
    uploadTrack: {
      width: 160,
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    uploadFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 3,
    },
  });
}
