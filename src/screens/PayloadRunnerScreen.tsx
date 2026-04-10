import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FileEntry, RootStackParamList } from '../types';
import { sendCommand } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useFileList } from '../hooks/useFileList';
import { getExecuteCommand } from '../utils/fileHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'PayloadRunner'>;

export function PayloadRunnerScreen(_props: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { entries, isLoading, isError, refetch } = useFileList('SD', '/scripts');

  const executePayload = (entry: FileEntry) => {
    Alert.alert(
      'Execute Payload',
      `Are you sure you want to run ${entry.name} on the device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          style: 'destructive',
          onPress: async () => {
            try {
              const command = getExecuteCommand(entry.path);
              if (!command) {
                Alert.alert('Unsupported file', 'Only executable payload types can be dispatched.');
                return;
              }
              await sendCommand(command);
              Alert.alert('Dispatched', 'Payload executing...');
            } catch (err: any) {
              Alert.alert('Execute Error', err.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: FileEntry }) => {
    if (item.type === 'folder' || item.type === 'parent') return null;
    return (
      <TouchableOpacity
        style={styles.fileRow}
        onPress={() => executePayload(item)}
      >
        <Icon
          name={item.name.endsWith('.js') ? 'language-javascript' : 'script-text'} 
          size={24} 
          color={theme.colors.primary} 
        />
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{item.name}</Text>
          <Text style={styles.fileSize}>{item.size}</Text>
        </View>
        <Icon name="play-circle-outline" size={24} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payload Runner</Text>
        <Text style={styles.headerSubtitle}>Run executable payload files from /scripts using supported firmware command mappings.</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : isError ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>Could not read /scripts. Ensure directory exists.</Text>
        </View>
      ) : (
        <FlatList
          data={entries.filter(e => e.type === 'file')}
          keyExtractor={(item) => item.path}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No scripts found in /sd/scripts</Text>
          }
        />
      )}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: { padding: 16, paddingBottom: 8 },
    headerTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
    headerSubtitle: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
    loader: { marginTop: 40 },
    listContent: { paddingHorizontal: 16, paddingVertical: 8 },
    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    fileInfo: { flex: 1, marginLeft: 16 },
    fileName: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
    fileSize: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
    emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 },
    messageBox: { padding: 20, alignItems: 'center' },
    messageText: { color: theme.colors.error, textAlign: 'center' },
  });
}
