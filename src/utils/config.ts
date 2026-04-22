// src/utils/config.ts
import Constants from 'expo-constants';

/**
 * Common App Configuration
 */
export const Config = {
  // Google Auth
  googleWebClientId: '799687156837-evkjkr3fknem4lqmf7plb2jfubekmflu.apps.googleusercontent.com',
  
  // App Version
  version: Constants.expoConfig?.version || '1.0.0',
  
  // Features (Feature flags can go here)
  features: {
    enableGoogleAuth: true,
    enableAppleAuth: true,
  }
};
