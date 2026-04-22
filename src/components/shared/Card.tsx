import React from 'react';
import { View, ViewProps, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/**
 * [Senior] Card Component
 * Base container for item list items and sections.
 */

interface CardProps extends ViewProps {
  onPress?: () => void;
  variant?: 'elevated' | 'outline' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  onPress, 
  variant = 'outline', 
  padding = 'md', 
  children, 
  style, 
  ...props 
}) => {
  const Container = onPress ? Pressable : View;

  return (
    <Container 
      onPress={onPress}
      style={onPress 
        ? (({ pressed }: any) => [
            styles.card(variant, padding), 
            pressed && { opacity: 0.8 },
            style
          ]) as any
        : [styles.card(variant, padding), style]
      } 
      {...props}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create((theme) => ({
  card: (variant: 'elevated' | 'outline' | 'ghost', padding: 'none' | 'sm' | 'md' | 'lg') => ({
    width: '100%',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    padding: padding === 'none' ? 0 : theme.spacing[padding as keyof typeof theme.spacing],
    
    ...(variant === 'outline' && {
      borderWidth: 1,
      borderColor: theme.colors.border,
    }),
    ...(variant === 'elevated' && {
       // Shared shadow style here if defined in theme
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.1,
       shadowRadius: 4,
       elevation: 2,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
    }),
  })
}));
