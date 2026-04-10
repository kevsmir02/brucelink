import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vibrate } from '../utils/vibrate';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootStackParamList, CommandHistoryItem } from '../types';
import { sendCommand } from '../services/api';
import { CommandChip } from '../components/CommandChip';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Terminal'>;

const QUICK_COMMANDS = [
  'info',
  'help',
  'uptime',
  'free',
  'settings',
  'loader list',
  'wifi on',
  'wifi off',
];

/** Commands that can power-cycle the device — confirm before sending. */
function isDestructiveCommand(cmd: string): boolean {
  const t = cmd.trim().toLowerCase();
  if (!t) {
    return false;
  }
  if (/^power\s+(reboot|off|sleep)\b/.test(t)) {
    return true;
  }
  if (t === 'reboot' || /^reboot\b/.test(t)) {
    return true;
  }
  return false;
}

export function TerminalScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const executeCommand = useCallback(async (trimmed: string) => {
    setInput('');
    setLoading(true);
    vibrate(20);

    const timestamp = Date.now();
    try {
      const response = await sendCommand(trimmed);
      setHistory(prev => [
        ...prev,
        { command: trimmed, response, timestamp, success: true },
      ]);
    } catch (err: any) {
      setHistory(prev => [
        ...prev,
        {
          command: trimmed,
          response: err.message ?? 'Network error',
          timestamp,
          success: false,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, []);

  const runCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) {
        return;
      }
      if (isDestructiveCommand(trimmed)) {
        Alert.alert(
          'Destructive command',
          `Send "${trimmed}"? This can reboot or power off the Bruce device.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send',
              style: 'destructive',
              onPress: () => {
                executeCommand(trimmed).catch(() => {});
              },
            },
          ],
        );
        return;
      }
      executeCommand(trimmed).catch(() => {});
    },
    [executeCommand],
  );

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={undefined}>
      {/* Info notice */}
      <View style={s.noticeBanner}>
        <Icon name="information-outline" size={14} color={theme.colors.primary} />
        <Text style={s.noticeText}>
          Commands are fire-and-forget. Output appears on the device screen.
        </Text>
      </View>

      {/* Output area */}
      <ScrollView
        ref={scrollRef}
        style={s.output}
        contentContainerStyle={s.outputContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>

        {history.length === 0 && (
          <Text style={s.placeholder}>
            {'> Type a command below or tap a quick-command chip.\n> Output is displayed on the Bruce device screen.'}
          </Text>
        )}

        {history.map((item, idx) => (
          <View key={idx} style={s.entry}>
            <Text style={s.prompt}>{'> '}{item.command}</Text>
            <Text style={[s.response, !item.success && s.responseError]}>
              {item.response}
            </Text>
            <Text style={s.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={s.entry}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
          </View>
        )}
      </ScrollView>

      {/* Quick commands */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.chips, { paddingBottom: Math.max(insets.bottom, 6) }]}
        contentContainerStyle={s.chipsContent}>
        {QUICK_COMMANDS.map(cmd => (
          <CommandChip key={cmd} label={cmd} onPress={() => runCommand(cmd)} />
        ))}
      </ScrollView>

      {/* Input row */}
      <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Text style={s.inputPrompt}>$</Text>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => runCommand(input)}
          placeholder="Enter command..."
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          blurOnSubmit={false}
          editable={!loading}
        />
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={s.clearBtn}>
            <Icon name="delete-sweep-outline" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.sendBtn, loading && s.sendBtnDisabled]}
          onPress={() => runCommand(input)}
          disabled={loading || !input.trim()}
          activeOpacity={0.8}>
          <Icon name="send" size={18} color={loading ? theme.colors.textMuted : theme.colors.background} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    noticeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(155,81,224,0.1)',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.primaryDim,
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 8,
    },
    noticeText: {
      color: theme.colors.primary,
      fontSize: 11,
      flex: 1,
      opacity: 0.8,
    },
    output: {
      flex: 1,
    },
    outputContent: {
      padding: 14,
      paddingBottom: 8,
    },
    placeholder: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.mono,
      fontSize: 13,
      lineHeight: 20,
    },
    entry: {
      marginBottom: theme.spacing.md,
    },
    prompt: {
      color: theme.colors.primary,
      fontFamily: theme.typography.mono,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
    },
    response: {
      color: theme.colors.text,
      fontFamily: theme.typography.mono,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 2,
      opacity: 0.9,
    },
    responseError: {
      color: theme.colors.error,
    },
    timestamp: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.mono,
      fontSize: 10,
      marginTop: 4,
      opacity: 0.6,
    },
    chips: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      minHeight: 50,
      backgroundColor: theme.colors.background,
    },
    chipsContent: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 0,
      alignItems: 'center',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
    },
    inputPrompt: {
      color: theme.colors.primary,
      fontFamily: theme.typography.mono,
      fontSize: 16,
      fontWeight: '700',
      marginRight: 8,
    },
    input: {
      flex: 1,
      color: theme.colors.text,
      fontFamily: theme.typography.mono,
      fontSize: 14,
      paddingVertical: 6,
      paddingHorizontal: 0,
    },
    clearBtn: {
      padding: 6,
      marginRight: 4,
    },
    sendBtn: {
      backgroundColor: theme.colors.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    sendBtnDisabled: {
      backgroundColor: theme.colors.border,
    },
  });
}
