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
import { COLORS } from '../utils/constants';

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
      style={styles.root}
      behavior={undefined}>
      {/* Info notice */}
      <View style={styles.noticeBanner}>
        <Icon name="information-outline" size={14} color={COLORS.primary} />
        <Text style={styles.noticeText}>
          Commands are fire-and-forget. Output appears on the device screen.
        </Text>
      </View>

      {/* Output area */}
      <ScrollView
        ref={scrollRef}
        style={styles.output}
        contentContainerStyle={styles.outputContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>

        {history.length === 0 && (
          <Text style={styles.placeholder}>
            {'> Type a command below or tap a quick-command chip.\n> Output is displayed on the Bruce device screen.'}
          </Text>
        )}

        {history.map((item, idx) => (
          <View key={idx} style={styles.entry}>
            <Text style={styles.prompt}>{'> '}{item.command}</Text>
            <Text style={[styles.response, !item.success && styles.responseError]}>
              {item.response}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={styles.entry}>
            <ActivityIndicator color={COLORS.primary} size="small" />
          </View>
        )}
      </ScrollView>

      {/* Quick commands */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.chips, { paddingBottom: Math.max(insets.bottom, 6) }]}
        contentContainerStyle={styles.chipsContent}>
        {QUICK_COMMANDS.map(cmd => (
          <CommandChip key={cmd} label={cmd} onPress={() => runCommand(cmd)} />
        ))}
      </ScrollView>

      {/* Input row */}
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Text style={styles.inputPrompt}>$</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => runCommand(input)}
          placeholder="Enter command..."
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          blurOnSubmit={false}
          editable={!loading}
        />
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
            <Icon name="delete-sweep-outline" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          onPress={() => runCommand(input)}
          disabled={loading || !input.trim()}
          activeOpacity={0.8}>
          <Icon name="send" size={18} color={loading ? COLORS.textMuted : COLORS.background} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050505',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(155,81,224,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryDim,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  noticeText: {
    color: COLORS.primary,
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
    color: COLORS.textMuted,
    fontFamily: 'Courier New',
    fontSize: 13,
    lineHeight: 20,
  },
  entry: {
    marginBottom: 16,
  },
  prompt: {
    color: COLORS.primary,
    fontFamily: 'Courier New',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  response: {
    color: COLORS.text,
    fontFamily: 'Courier New',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
    opacity: 0.9,
  },
  responseError: {
    color: COLORS.error,
  },
  timestamp: {
    color: COLORS.textMuted,
    fontFamily: 'Courier New',
    fontSize: 10,
    marginTop: 4,
    opacity: 0.6,
  },
  chips: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    minHeight: 50,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  inputPrompt: {
    color: COLORS.primary,
    fontFamily: 'Courier New',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontFamily: 'Courier New',
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  clearBtn: {
    padding: 6,
    marginRight: 4,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.border,
  },
});
