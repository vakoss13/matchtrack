import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { AuthScreen } from '../screens/AuthScreen';
import { DrawerNavigator } from './DrawerNavigator';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { ChatScreen } from '../screens/ChatScreen';

import messaging from '@react-native-firebase/messaging';
import { createNavigationContainerRef } from '@react-navigation/native';
import { requestUserPermission, registerAppWithFCM } from '../services/notifications';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useUnistyles();

  // 1. Настройка системных баров для Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backgroundColor = theme.colors.background || '#0D0D0E';
      SystemUI.setBackgroundColorAsync(backgroundColor).catch(() => {});
    }
  }, [theme]);

  // 2. Уведомления: Разрешения и Слушатели
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        await registerAppWithFCM();
        await requestUserPermission();

        // Слушаем нажатие на уведомление, когда приложение в фоне
        messaging().onNotificationOpenedApp(remoteMessage => {
          console.log('🔗 Notification caused app to open from background state:', remoteMessage.data);
          handleNotificationClick(remoteMessage);
        });

        // Слушаем нажатие на уведомление, когда приложение было закрыто (Killed)
        messaging().getInitialNotification().then(remoteMessage => {
          if (remoteMessage) {
            console.log('🔗 Notification caused app to open from quit state:', remoteMessage.data);
            handleNotificationClick(remoteMessage);
          }
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.log('⚠️ Firebase listeners failed (likely Expo Go):', message);
      }
    };

    const handleNotificationClick = (remoteMessage: any) => {
      if (!remoteMessage?.data) return;
      const { friendId, friendName } = remoteMessage.data;
      if (friendId && friendName && navigationRef.isReady()) {
        navigationRef.navigate('Chat', { friendId, friendName });
      }
    };

    setupNotifications();
  }, []);

  // 3. Инициализация сессии и подписка
  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
      } catch (e) {
        console.error('Initial session check error:', e);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed, event:', _event);
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Экран загрузки
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      primary: theme.colors.primary,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navigationTheme} ref={navigationRef}>
        {session && session.user ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DrawerRoot" component={DrawerNavigator} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={AuthScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}