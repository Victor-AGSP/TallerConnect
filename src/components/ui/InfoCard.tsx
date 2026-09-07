import {
  ReactNode,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
} from '@/constants/theme';

interface InfoCardProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}

export function InfoCard({
  title,
  subtitle,
  children,
}: InfoCardProps) {
  return (
    <View style={styles.card}>
      {title ? (
        <Text style={styles.title}>{title}</Text>
      ) : null}

      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}

      {children ? (
        <View style={styles.content}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,

    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 2,
  },

  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  content: {
    marginTop: spacing.md,
  },
});