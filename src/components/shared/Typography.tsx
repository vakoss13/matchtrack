import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'subtitle' | 'caption' | 'tiny';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  bold?: boolean;
  medium?: boolean;
  italic?: boolean;
  lineHeight?: number;
}

export const Typography: React.FC<TypographyProps> = ({ 
  variant = 'body', 
  color, 
  align = 'left', 
  bold = false,
  medium = false,
  italic = false,
  lineHeight,
  style, 
  children, 
  ...props 
}) => {
  return (
    <Text 
      style={[
        styles.text(variant, color, align, bold, medium, italic, lineHeight), 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create((theme) => ({
  text: (
    variant: TypographyVariant, 
    color?: string, 
    align?: TextStyle['textAlign'], 
    bold?: boolean,
    medium?: boolean,
    italic?: boolean,
    lineHeight?: number
  ) => ({
    fontSize: theme.typography[variant as keyof typeof theme.typography],
    color: color || theme.colors.text,
    textAlign: align,
    lineHeight,
    fontStyle: italic ? 'italic' : 'normal',
    fontWeight: (() => {
        if (bold) return '700' as const;
        if (medium) return '500' as const;
        if (variant.startsWith('h')) return '800' as const;
        return '400' as const;
    })(),
  })
}));
