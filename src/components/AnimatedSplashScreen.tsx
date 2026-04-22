import React, { useEffect } from 'react';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Prevent native splash screen from hiding immediately
ExpoSplashScreen.preventAutoHideAsync().catch(() => { /* Handle error gracefully */ });

export const AnimatedSplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const { theme } = useUnistyles();
  const opacity = useSharedValue(1);

  useEffect(() => {
    const hideNativeSplash = async () => {
      await ExpoSplashScreen.hideAsync();
      
      // Start fade out animation after 1.5s
      opacity.value = withDelay(1500, withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      }));
    };
    
    hideNativeSplash();
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      // If opacity is 0, we can hide it completely using pointerEvents or display
      display: opacity.value === 0 ? 'none' : 'flex'
    };
  });

  return (
    <Animated.View style={[stylesheet.container, animatedStyle]} pointerEvents="none">
      <Animated.Text style={stylesheet.logoText}>MatchTrack</Animated.Text>
    </Animated.View>
  );
};

const stylesheet = StyleSheet.create((theme) => ({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 2,
  }
}));
