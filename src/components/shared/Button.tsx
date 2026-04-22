import React from 'react';
import { 
  Pressable, 
  Text, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle, 
  PressableProps, 
  View 
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/**
 * [Senior] Button Component
 * Reusable primitive for action buttons across the app.
 * Supporting variants, loading states, and consistent spacing.
 */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps extends PressableProps {
  title?: string;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  title, 
  loading = false, 
  variant = 'primary', 
  style, 
  textStyle, 
  icon,
  children, 
  disabled,
  ...props 
}) => {
  const { theme } = useUnistyles();

  return (
    <Pressable 
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button(variant, pressed, disabled), 
        style
      ]} 
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000' : theme.colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {title ? (
            <Text style={[styles.text(variant), textStyle]}>{title}</Text>
          ) : (
            children
          )}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create((theme) => ({
  button: (variant: ButtonVariant, pressed: boolean, disabled?: boolean | null) => ({
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    opacity: pressed || disabled ? 0.7 : 1,
    
    ...(variant === 'primary' && {
      backgroundColor: theme.colors.primary,
    }),
    ...(variant === 'secondary' && {
      backgroundColor: theme.colors.secondary,
    }),
    ...(variant === 'outline' && {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    }),
    ...(variant === 'danger' && {
      backgroundColor: theme.colors.danger,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
    }),
  }),
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  text: (variant: ButtonVariant) => ({
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: '#fff',
    ...(variant === 'primary' && { color: '#000' }), // Assuming primary is light (neon)
  }),
  iconContainer: {
    marginRight: theme.spacing.xs,
  }
}));
