import messaging from '@react-native-firebase/messaging';
import { supabase } from './supabase';
import { Platform } from 'react-native';

export const requestUserPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('🔔 Notification permission status:', authStatus);
      await getFcmToken();
    }
  } catch (e) {
    console.log('⚠️ Firebase Messaging not supported in this environment (e.g. Expo Go)');
  }
};

const getFcmToken = async () => {
  try {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      console.log('📱 FCM Token:', fcmToken);
      await saveTokenToDatabase(fcmToken);
    }
  } catch (error) {
    console.log('❌ Error getting FCM token:', error);
  }
};

const saveTokenToDatabase = async (token: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', user.id);
      
      if (error) console.log('❌ Error saving FCM token to DB:', error);
      else console.log('✅ FCM token saved to profile');
    }
  } catch (e) {
    console.log('❌ Auth error in notification service:', e);
  }
};

export const registerAppWithFCM = async () => {
  try {
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }
  } catch (e) {}
};
