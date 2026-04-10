import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export function PromptModal({
  visible,
  title,
  placeholder,
  defaultValue = '',
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
}: Props) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, defaultValue]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <KeyboardAvoidingView style={s.overlay} behavior="padding">
        <View style={s.dialog}>
          <Text style={s.title}>{title}</Text>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleConfirm}
            returnKeyType="done"
            selectTextOnFocus
          />
          <View style={s.buttons}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, !value.trim() && s.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!value.trim()}>
              <Text style={s.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    dialog: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 16,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      color: theme.colors.text,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      fontFamily: 'Courier New',
      marginBottom: 20,
    },
    buttons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    cancelBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    confirmBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
    },
    confirmBtnDisabled: {
      opacity: 0.4,
    },
    confirmText: {
      color: theme.colors.background,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
