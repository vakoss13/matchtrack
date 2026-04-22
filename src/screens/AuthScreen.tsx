import React, { useState } from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  View 
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';

// [Senior] Design System Primitives
import { Typography } from '../components/shared/Typography';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';

// [Senior] Custom hooks and utilities for better logic isolation
import { useAuth, AuthResult } from '../hooks/useAuth';
import { Config } from '../utils/config';

/**
 * [Senior] AuthScreen: Follows Separation of Concerns
 * - UI is simplified using the Design System (Typography, Button, Input).
 * - Logic is handled by useAuth and Config.
 */
GoogleSignin.configure({
  webClientId: Config.googleWebClientId,
  offlineAccess: true,
});

export const AuthScreen = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  
  // Custom hook for UI logic
  const { signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth();

  // Local component state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);



  /**
   * Helper to handle and display auth results gracefully
   */
  const handleAuthResult = (result: AuthResult, successMsg?: string) => {
    if (result.success) {
      if (successMsg) {
        Toast.show({
          type: 'success',
          text1: t('common.success'),
          text2: successMsg,
        });
      }
    } else {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: result.error.message,
      });
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('auth.validation.required'),
      });
      return;
    }

    const result = isSignUp 
      ? await signUp(email, password) 
      : await signIn(email, password);

    handleAuthResult(
      result, 
      isSignUp ? t('auth.message.confirmation') : undefined
    );
  };

  const handleSocialGoogle = async () => {
    const result = await signInWithGoogle();
    handleAuthResult(result);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={stylesheet.container}
    >
      <ScrollView 
        contentContainerStyle={stylesheet.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={stylesheet.logoContainer}>
          <View style={stylesheet.iconCircle}>
            <Ionicons name="football" size={48} color={theme.colors.primary} />
          </View>
          <Typography variant="h1" color={theme.colors.primary}>MatchTrack</Typography>
          <Typography variant="body" color={theme.colors.subtext} align="center">
            {isSignUp ? t('auth.title.signUp') : t('auth.title.signIn')}
          </Typography>
        </View>

        {/* Form Section */}
        <View style={stylesheet.formContainer}>
          <Input
            label={t('auth.label.email')}
            placeholder={t('auth.label.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            icon={<Ionicons name="mail-outline" size={20} color={theme.colors.subtext} />}
          />
          <Input
            label={t('auth.label.password')}
            placeholder={t('auth.label.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.subtext} />}
          />

          <Button
            title={isSignUp ? t('auth.button.signUp') : t('auth.button.signIn')}
            onPress={handleEmailAuth}
            loading={authLoading}
            style={stylesheet.primaryButton}
          />

          <Button
            variant="ghost"
            title={isSignUp ? t('auth.link.signIn') : t('auth.link.signUp')}
            onPress={() => setIsSignUp(!isSignUp)}
            style={stylesheet.switchButton}
            textStyle={stylesheet.switchText}
          />
        </View>

        {/* Divider */}
        <View style={stylesheet.dividerContainer}>
          <View style={stylesheet.divider} />
          <Typography variant="caption" color={theme.colors.subtext} style={stylesheet.dividerText}>
            {t('auth.label.or')}
          </Typography>
          <View style={stylesheet.divider} />
        </View>

        {/* Social Section */}
        <View style={stylesheet.buttonsContainer}>
          <Button
            variant="outline"
            title={t('auth.button.google')}
            onPress={handleSocialGoogle}
            loading={authLoading}
            icon={<Ionicons name="logo-google" size={24} color={theme.colors.text} />}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const stylesheet = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formContainer: {
    marginBottom: theme.spacing.xl,
  },
  primaryButton: {
    marginTop: theme.spacing.sm,
  },
  switchButton: {
    marginTop: theme.spacing.md,
  },
  switchText: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption + 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    textTransform: 'uppercase',
  },
  buttonsContainer: {
    gap: theme.spacing.md,
  }
}));