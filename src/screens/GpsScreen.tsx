import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { DeviceScreenBuffer, DeviceScreenBufferRef } from '../components/DeviceScreenBuffer';
import { sendCommand } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Gps'>;

export function GpsScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);

  const bufRef = useRef<DeviceScreenBufferRef>(null);

  const execNav = async (cmd: string) => {
    try {
      await sendCommand(cmd);
      await new Promise(r => setTimeout(r, 200));
      bufRef.current?.refresh();
      // Temporarily bump auto-reload rate to feel responsive
      bufRef.current?.setAutoReload(500);
      setTimeout(() => bufRef.current?.setAutoReload(2000), 1000);
    } catch { /* ignore */ }
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      
      <View style={s.infoBanner}>
        <Icon name="information" size={16} color={theme.colors.primary} />
        <Text style={s.infoText}>
          These features run directly on the device. Use the D-pad below to navigate to the desired function.
        </Text>
      </View>

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
    <View style={s.sectionHeader}>
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
    infoBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(255,170,0,0.1)', padding: 12,
      borderRadius: theme.radius.sm, marginBottom: 16,
    },
    infoText: {
      color: theme.colors.text, fontSize: 13, flex: 1, opacity: 0.9, lineHeight: 18,
    },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginTop: 20, marginBottom: theme.spacing.md, marginLeft: 4,
    },
    sectionTitle: {
      color: theme.colors.textMuted, fontSize: 11,
      fontWeight: '700', letterSpacing: 1.5,
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
