import { ReactNode } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  spacing,
} from '@/constants/theme';

interface AppScreenProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppScreen({
  eyebrow,
  title,
  subtitle,
  children,
}: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
        >
          <View style={styles.header}>
            {eyebrow ? (
              <Text style={styles.eyebrow}>
                {eyebrow}
              </Text>
            ) : null}

            <Text style={styles.title}>
              {title}
            </Text>

            {subtitle ? (
              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.body}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  header: {
    marginBottom: spacing.xl,
  },

  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },

  title: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  body: {
    gap: spacing.md,
  },
});