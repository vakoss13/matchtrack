import React from 'react';
import { View, Image, ViewStyle, ImageStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/**
 * [Senior] Avatar Component
 * Handles user profile images with status indicators.
 */

interface AvatarProps {
  uri?: string;
  size?: number;
  status?: 'online' | 'offline' | 'busy' | 'none';
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  uri, 
  size = 48, 
  status = 'none', 
  style 
}) => {
  const { theme } = useUnistyles();

  const getStatusColor = () => {
    switch (status) {
      case 'online': return theme.colors.success;
      case 'busy': return theme.colors.live;
      case 'offline': return theme.colors.subtext;
      default: return 'transparent';
    }
  };

  return (
    <View style={[styles.container(size), style]}>
      {uri ? (
        <Image 
          source={{ uri }} 
          style={styles.image(size)} 
        />
      ) : (
        <View style={[styles.image(size), styles.placeholder]} />
      )}
      
      {status !== 'none' && (
        <View style={styles.statusDot(size, getStatusColor())} />
      )}
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: (size: number) => ({
    width: size,
    height: size,
    position: 'relative',
  }),
  image: (size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.colors.border,
  }),
  placeholder: {
    backgroundColor: theme.colors.surfaceCard,
  },
  statusDot: (size: number, color: string) => ({
    position: 'absolute',
    bottom: size * 0.02,
    right: size * 0.02,
    width: size * 0.25,
    height: size * 0.25,
    borderRadius: size * 0.125,
    borderWidth: 2,
    borderColor: theme.colors.background,
    backgroundColor: color,
  })
}));
