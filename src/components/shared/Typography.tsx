import React from 'react';
import { Text, TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/**
 * [Senior] Typography Component
 * Centralizes the typography system across the app.
 * Ensuring consistency in font sizes, weights, and colors.
 */

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'subtitle' | 'caption';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string; // Optional custom color, else uses theme.colors.text
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export const Typography: React.FC<TypographyProps> = ({ 
  variant = 'body', 
  color, 
  align = 'left', 
  bold = false,
  style, 
  children, 
  ...props 
}) => {
  return (
    <Text 
      style={[
        styles.text(variant, color, align, bold), 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create((theme) => ({
  text: (variant: TypographyVariant, color?: string, align?: string, bold?: boolean) => ({
    fontSize: theme.typography[variant],
    color: color || theme.colors.text,
    textAlign: align as any,
    fontWeight: bold ? '700' : '400',
    // Example: H1 always extra bold
    ...(variant === 'h1' && { fontWeight: '900' }),
    ...(variant === 'h2' && { fontWeight: '800' }),
    ...(variant === 'h3' && { fontWeight: '700' }),
  })
}));
