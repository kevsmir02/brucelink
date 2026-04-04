import { useQuery } from '@tanstack/react-query';
import { getFileContent } from '../services/api';
import { FileSystem } from '../types';

/**
 * Returns the query key for a specific file's content.
 * Exported so mutations can invalidate it after a save.
 */
export function fileContentKey(fs: FileSystem, filePath: string) {
  return ['fileContent', fs, filePath] as const;
}

/**
 * Fetches the text content of a file from the device.
 * Replaces the manual useEffect/try-catch/loading pattern in FileEditorScreen.
 */
export function useFileContent(fs: FileSystem, filePath: string) {
  const result = useQuery<string, Error>({
    queryKey: fileContentKey(fs, filePath),
    queryFn: () => getFileContent(fs, filePath),
    // Don't retry file reads — if the file is missing, it's missing
    retry: false,
    // Keep content fresh in cache for 5 minutes (editor doesn't need live refresh)
    staleTime: 5 * 60_000,
  });

  return {
    content: result.data ?? '',
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
  };
}
