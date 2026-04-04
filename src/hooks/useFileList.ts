import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listFiles,
  deleteFile,
  renameFile,
  createFolder,
  createFile,
  uploadFile,
} from '../services/api';
import { FileEntry, FileSystem } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Returns the React Query key for a directory listing.
 * Exported so callers can build targeted invalidations.
 */
export function fileListKey(fs: FileSystem, path: string) {
  return ['files', fs, path] as const;
}

/**
 * Fetches the directory listing for a given fs + path, with automatic
 * cache invalidation on mutations (delete, rename, create, upload).
 * Replaces ~40 lines of manual loading/error/refresh state in FileExplorerScreen.
 */
export function useFileList(fs: FileSystem, path: string) {
  const queryClient = useQueryClient();
  const key = fileListKey(fs, path);

  const result = useQuery<FileEntry[], Error>({
    queryKey: key,
    queryFn: async () => {
      const data = await listFiles(fs, path);
      // Persist last visited location as a side-effect of a successful fetch
      await AsyncStorage.setItem(STORAGE_KEYS.lastFs, fs);
      await AsyncStorage.setItem(STORAGE_KEYS.lastPath, path);
      return data;
    },
    staleTime: 0, // Always re-fetch on focus (files can change on device)
  });

  // Re-fetch every time the screen regains focus
  useFocusEffect(
    useCallback(() => {
      result.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fs, path]),
  );

  // Invalidate helper — used by all mutations below
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: key });
  }, [queryClient, key]);

  // ----- Mutations -----

  const deleteMutation = useMutation({
    mutationFn: (filePath: string) => deleteFile(fs, filePath),
    onSuccess: invalidate,
  });

  const renameMutation = useMutation({
    mutationFn: ({ filePath, newName }: { filePath: string; newName: string }) =>
      renameFile(fs, filePath, newName),
    onSuccess: invalidate,
  });

  const createFolderMutation = useMutation({
    mutationFn: (folderPath: string) => createFolder(fs, folderPath),
    onSuccess: invalidate,
  });

  const createFileMutation = useMutation({
    mutationFn: (newFilePath: string) => createFile(fs, newFilePath),
    onSuccess: invalidate,
  });

  const uploadMutation = useMutation({
    mutationFn: ({
      fileUri,
      fileName,
      onProgress,
    }: {
      fileUri: string;
      fileName: string;
      onProgress?: (pct: number) => void;
    }) => uploadFile(fs, path, fileUri, fileName, onProgress),
    onSuccess: invalidate,
  });

  const isDisconnected =
    result.isError &&
    (result.error?.message?.includes('Network Error') ||
      result.error?.message?.includes('ECONNABORTED') ||
      result.error?.message?.includes('unreachable'));

  return {
    entries: result.data ?? [],
    isLoading: result.isLoading,
    isRefetching: result.isRefetching,
    isError: result.isError,
    isDisconnected,
    error: result.isError ? 'Failed to list files. Check connection to BruceNet.' : null,
    refetch: result.refetch,
    // Mutations — callers can check .isPending for loading state
    deleteFile: deleteMutation.mutateAsync,
    renameFile: renameMutation.mutateAsync,
    createFolder: createFolderMutation.mutateAsync,
    createFile: createFileMutation.mutateAsync,
    uploadFile: uploadMutation.mutateAsync,
    uploadProgress: uploadMutation.isPending,
  };
}
