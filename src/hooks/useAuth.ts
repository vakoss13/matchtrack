import { useState } from 'react';
import { supabase } from '../services/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export type AuthResult = 
  | { success: true; data: any }
  | { success: false; error: { message: string } };

export const useAuth = () => {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Unknown error' } };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { success: false, error };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Unknown error' } };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<AuthResult> => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token from Google');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) return { success: false, error };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Google Auth Error' } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<AuthResult> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, error };
      return { success: true, data: null };
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Logout error' } };
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loading,
  };
};
