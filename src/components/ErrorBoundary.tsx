import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.container}>
      <Text style={s.title}>Something went wrong</Text>
      <Text style={s.message}>This screen crashed. You can retry safely.</Text>
      <TouchableOpacity style={s.button} onPress={onRetry} activeOpacity={0.8}>
        <Text style={s.buttonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error): void {
    // Intentionally swallow here; app-level crash should remain contained to this screen.
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 20,
    },
    button: {
      minHeight: 44,
      minWidth: 120,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    buttonText: {
      color: theme.colors.background,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
