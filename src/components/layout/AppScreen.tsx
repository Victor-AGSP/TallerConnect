import { ReactNode } from 'react';

import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {eyebrow ? (
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          ) : null}

          <Text style={styles.title}>{title}</Text>

          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.body}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingTop: (StatusBar.currentHeight ?? 20) + spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 50,
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
    marginBottom: 6,
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