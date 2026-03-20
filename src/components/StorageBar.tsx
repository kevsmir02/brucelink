import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StorageInfo } from '../types';
import { COLORS } from '../utils/constants';

interface Props {
  label: string;
  info: StorageInfo;
}

function parseSize(s: string): number {
  const match = s.trim().match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  switch (unit) {
    case 'GB': return val * 1024 * 1024 * 1024;
    case 'MB': return val * 1024 * 1024;
    case 'KB': return val * 1024;
    default: return val;
  }
}

export const StorageBar: React.FC<Props> = ({ label, info }) => {
  const total = parseSize(info.total);
  const used = parseSize(info.used);
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const barColor = pct > 85 ? COLORS.error : pct > 65 ? COLORS.warning : COLORS.primary;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.stats}>
          {info.used} / {info.total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.free}>{info.free} free</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  track: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  free: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
