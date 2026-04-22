import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next'; // Импортируем хук перевода

// Импорты твоих экранов
import { MatchScreen } from '../screens/MatchScreen';
import { PredictionsScreen } from '../screens/PredictionsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const { theme, rt } = useUnistyles();
  const isLight = rt.themeName === 'light';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const bottomOffset = Platform.OS === 'android'
    ? (insets.bottom > 0 ? insets.bottom + 10 : 25)
    : (insets.bottom + 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.subtext,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomOffset,
          left: 16,
          right: 16,
          borderRadius: 28,
          height: 68,
          borderTopWidth: 0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isLight ? '#FFFFFF' : '#000000'),
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isLight ? 0.1 : 0.4,
          shadowRadius: 8,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -4,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isLight ? 'light' : 'dark'}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 28, overflow: 'hidden' }]}
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, {
              backgroundColor: isLight ? '#FFFFFF' : '#000000',
              borderRadius: 28,
              borderWidth: 1,
              borderColor: theme.colors.border
            }]} />
          )
        ),
      })}
    >
      <Tab.Screen
        name="Match"
        component={MatchScreen}
        options={{
          tabBarLabel: t('tabs.matches'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "football" : "football-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Predictions"
        component={PredictionsScreen} 
        options={{
          tabBarLabel: t('drawer.myPredictions'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "list" : "list-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: t('tabs.leaderboard'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "trophy" : "trophy-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}