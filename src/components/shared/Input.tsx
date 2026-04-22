import React, { forwardRef } from 'react';
import { 
  TextInput, 
  TextInputProps, 
  View, 
  Text, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/**
 * [Senior] Input Component
 * Shared primitive for text entry.
 * Including label, error messages, and consistent theme-based styling.
 */

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(({ 
  label, 
  error, 
  containerStyle, 
  inputStyle, 
  icon,
  ...props 
}, ref) => {
  const { theme } = useUnistyles();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer, 
        error && styles.errorInput,
        props.editable === false && styles.disabledInput
      ]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.subtext}
          style={[styles.input, inputStyle]}
          {...props}
        />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    fontSize: theme.typography.caption + 2,
    color: theme.colors.subtext,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.typography.body,
  },
  errorInput: {
    borderColor: theme.colors.error,
  },
  disabledInput: {
    opacity: 0.5,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
  }
}));
