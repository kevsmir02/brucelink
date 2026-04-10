import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  ToastAndroid,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootStackParamList } from '../types';
import { saveFileContent, sendCommand } from '../services/api';
import { FONTS } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';
import { isExecutable, getExecuteCommand, getFileExtension } from '../utils/fileHelpers';
import { useFileContent } from '../hooks/useFileContent';

type Props = NativeStackScreenProps<RootStackParamList, 'FileEditor'>;

// Defined outside component to avoid the no-unstable-nested-components lint warning.
function EditorHeaderRight({
  isDirty,
  saving,
  executable,
  onSave,
  onRun,
}: {
  isDirty: boolean;
  saving: boolean;
  executable: boolean;
  onSave: () => void;
  onRun: () => void;
}) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.headerActions}>
      {executable && (
        <TouchableOpacity onPress={onRun} style={s.headerBtn}>
          <Icon name="play" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onSave}
        style={[s.headerBtn, !isDirty && s.headerBtnDisabled]}
        disabled={!isDirty || saving}>
        {saving ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Icon
            name="content-save-outline"
            size={22}
            color={isDirty ? theme.colors.primary : theme.colors.textMuted}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

export function FileEditorScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const { fs, filePath } = route.params;
  const fileName = filePath.split('/').pop() ?? filePath;
  const ext = getFileExtension(fileName);
  const executable = isExecutable(fileName);

  // Load file content via React Query — handles loading/error states
  const { content: originalContent, isLoading, isError } = useFileContent(fs, filePath);

  // Local editable copy, initialised from the query result
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Sync local state when query data arrives
  useEffect(() => {
    if (originalContent !== undefined) {
      setContent(originalContent);
    }
  }, [originalContent]);

  const isDirty = content !== originalContent;

  const executeFile = useCallback(async () => {
    const cmd = getExecuteCommand(filePath);
    if (!cmd) return;
    try {
      const resp = await sendCommand(cmd);
      ToastAndroid.show(resp || 'Command sent to device', ToastAndroid.SHORT);
    } catch {
      Alert.alert('Error', 'Failed to send run command');
    }
  }, [filePath]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveFileContent(fs, filePath, content);
      ToastAndroid.show('Saved', ToastAndroid.SHORT);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [fs, filePath, content]);

  const handleRun = useCallback(async () => {
    if (isDirty) {
      Alert.alert('Unsaved Changes', 'Save before running?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save & Run',
          onPress: async () => {
            await handleSave();
            await executeFile();
          },
        },
        { text: 'Run Without Saving', onPress: executeFile },
      ]);
    } else {
      await executeFile();
    }
  }, [isDirty, handleSave, executeFile]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: fileName,
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <EditorHeaderRight
          isDirty={isDirty}
          saving={saving}
          executable={executable}
          onSave={handleSave}
          onRun={handleRun}
        />
      ),
    });
  }, [navigation, fileName, isDirty, saving, executable, handleSave, handleRun]);

  // Warn on unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={s.loadingText}>Loading {fileName}...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.center}>
        <Icon name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={s.errorText}>Could not load file content.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <View style={s.metaBar}>
        <Text style={s.metaPath} numberOfLines={1}>{filePath}</Text>
        <View style={s.metaBadges}>
          {ext && <Text style={s.badge}>{ext.toUpperCase()}</Text>}
          {isDirty && <Text style={[s.badge, s.badgeDirty]}>MODIFIED</Text>}
        </View>
      </View>

      <TextInput
        ref={inputRef}
        style={s.editor}
        multiline
        value={content}
        onChangeText={setContent}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
        scrollEnabled
        keyboardType="default"
        placeholder="Empty file..."
        placeholderTextColor={theme.colors.textMuted}
      />
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.error,
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: 6,
    marginLeft: 8,
  },
  headerBtnDisabled: {
    opacity: 0.4,
  },
  metaBar: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaPath: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: 'Courier New',
    flex: 1,
    marginRight: 8,
  },
  metaBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: theme.colors.background,
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeDirty: {
    color: theme.colors.warning,
    borderColor: theme.colors.warning,
  },
  editor: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: 'Courier New',
    fontSize: FONTS.monoSize,
    padding: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  });
}
