import React, { useState, useCallback } from 'react';
import { View, Text, Switch, Pressable, Image, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, useUnistyles, UnistylesRuntime } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { ScreenHeader } from '../components/shared/ScreenHeader';

export const SettingsScreen = ({ navigation }: any) => {
  const { theme, rt } = useUnistyles();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
           setUser(user);
           // Also fetch database profile to guarantee latest data
           supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
               if (data) {
                   setUser((prev: any) => ({ ...prev, dbProfile: data }));
               }
           });
        }
      });
    }, [])
  );

  const toggleTheme = () => {
    const nextTheme = UnistylesRuntime.themeName === 'dark' ? 'light' : 'dark';
    UnistylesRuntime.setTheme(nextTheme);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleLogout = async () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.logout'), 
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          }
        }
      ]
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={stylesheet.sectionContainer}>
      <Text style={stylesheet.sectionTitle}>{title}</Text>
      <View style={stylesheet.sectionCard}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={stylesheet.container}>
      <ScreenHeader title={t('drawer.settings')} />
      <ScrollView contentContainerStyle={stylesheet.content} showsVerticalScrollIndicator={false}>
        
        {/* HEADER / PROFILE */}
        <LinearGradient
          colors={[
            rt.themeName === 'dark' ? '#161618' : theme.colors.surface, 
            theme.colors.background
          ]}
          style={stylesheet.profileHeader}
        >
          <View style={stylesheet.avatarWrapper}>
            <Image 
              source={{ uri: user?.dbProfile?.avatar_url || user?.user_metadata?.avatar_url || 'https://api.dicebear.com/8.x/fun-emoji/png?seed=User' }} 
              style={stylesheet.avatar}
            />
            <View style={stylesheet.onlineBadge} />
          </View>
          <Text style={stylesheet.profileName}>{user?.dbProfile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={stylesheet.profileEmail}>{user?.email}</Text>
          
          <Pressable style={stylesheet.editProfileButton} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={stylesheet.editProfileText}>{t('settings.editProfile')}</Text>
          </Pressable>
        </LinearGradient>

        {renderSection(t('settings.appearance'), (
          <View style={stylesheet.settingRow}>
            <View style={stylesheet.iconLabel}>
              <View style={[stylesheet.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                <Ionicons name="moon" size={20} color={theme.colors.primary} />
              </View>
              <Text style={stylesheet.settingLabel}>{t('settings.darkMode')}</Text>
            </View>
            <Switch 
              value={rt.themeName === 'dark'} 
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={rt.themeName === 'dark' ? theme.colors.primary : '#FFFFFF'}
            />
          </View>
        ))}

        {renderSection(t('settings.language'), (
          <>
            <Pressable 
              style={[stylesheet.settingRow, i18n.language === 'en' && stylesheet.activeLanguage]} 
              onPress={() => changeLanguage('en')}
            >
              <Text style={[stylesheet.settingLabel, i18n.language === 'en' && { color: theme.colors.primary }]}>English</Text>
              {i18n.language === 'en' && <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />}
            </Pressable>
            <View style={stylesheet.divider} />
            <Pressable 
              style={[stylesheet.settingRow, i18n.language === 'ru' && stylesheet.activeLanguage]} 
              onPress={() => changeLanguage('ru')}
            >
              <Text style={[stylesheet.settingLabel, i18n.language === 'ru' && { color: theme.colors.primary }]}>Русский</Text>
              {i18n.language === 'ru' && <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />}
            </Pressable>
          </>
        ))}

        <Pressable style={stylesheet.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
          <Text style={stylesheet.logoutText}>{t('settings.logout')}</Text>
        </Pressable>

        <View style={stylesheet.footer}>
          <Text style={stylesheet.versionText}>Version 1.0.0 (Build 24)</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const stylesheet = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 120,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.success,
    borderWidth: 3,
    borderColor: rt.themeName === 'dark' ? theme.colors.surface : '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.subtext,
    marginBottom: 20,
  },
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: rt.themeName === 'dark' ? '#1F1F22' : theme.colors.border,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 18,
  },
  activeLanguage: {
    backgroundColor: theme.colors.primary + '10',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: theme.colors.danger + '15',
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.subtext,
    opacity: 0.5,
  }
}));
