// Re-export all types from the canonical firmware types module.
// Legacy screens that import from '@/types' or '../types' continue to work.
export type {
  SystemInfo,
  StorageInfo,
  FileEntry,
  FileSystem,
  CommandHistoryItem,
  RootStackParamList,
} from './firmware';

// Re-export everything else for new consumers
export * from './firmware';
