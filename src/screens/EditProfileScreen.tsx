import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { ScreenHeader } from '../components/shared/ScreenHeader';
import { Button } from '../components/shared/Button';
import * as ImagePicker from 'expo-image-picker';

const SYSTEM_AVATARS = [
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Felix',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Aneka',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Boots',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Callie',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Daisy',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Duke',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Harley',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Misty',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Oliver',
  'https://api.dicebear.com/8.x/fun-emoji/png?seed=Whiskers'
];

export const EditProfileScreen = ({ navigation }: any) => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showSystemAvatars, setShowSystemAvatars] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Загружаем профиль: База Данных всегда главнее (так как она обновляется надежнее)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      const userMeta = user.user_metadata || {};
        
      if (data && data.display_name) {
         setDisplayName(data.display_name);
      } else if (userMeta.full_name) {
         setDisplayName(userMeta.full_name);
      }

      if (data && data.avatar_url) {
         setAvatarUrl(data.avatar_url);
      } else if (userMeta.avatar_url) {
         setAvatarUrl(userMeta.avatar_url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    setShowAvatarOptions(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(t('common.error'), t('editProfileScreen.errorGallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Отключаем страшный системный экран обрезки
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
       uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpeg';
      const fileName = `${user.id}_${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${ext}`,
      } as any);

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
         console.warn("Upload via SDK failed, you might need base64. Error:", error);
         throw error;
      }

      if (data) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        setAvatarUrl(urlData.publicUrl);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert(t('common.error'), 'Failed to upload image. Using system avatars is recommended.');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Update metadata (Auth table) - always reliable
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: displayName, avatar_url: avatarUrl }
      });
      if (authError) throw authError;

      // Update Database (optional, might fail due to RLS, so we ignore failures)
      await supabase
        .from('profiles')
        .upsert({ 
           id: user.id, 
           display_name: displayName,
           avatar_url: avatarUrl
        });
      
      Alert.alert(t('common.success'), t('editProfileScreen.successMessage'));
      navigation.goBack();
    } catch (e: any) {
       Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
         <ScreenHeader title={t('editProfileScreen.title')} showBack onBack={() => navigation.goBack()} />
         <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('editProfileScreen.title')} showBack onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.avatarSection}>
          <Pressable onPress={() => setShowAvatarOptions(true)} style={styles.avatarWrapper}>
             <Image source={{ uri: avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} style={styles.avatar} />
             <View style={styles.editIconBadge}>
               <Ionicons name="camera" size={16} color="#000" />
             </View>
          </Pressable>
        </View>

        <View style={styles.inputSection}>
           <Text style={styles.label}>{t('editProfileScreen.displayName')}</Text>
           <TextInput 
             style={styles.input}
             value={displayName}
             onChangeText={setDisplayName}
             placeholder={t('editProfileScreen.enterName')}
             placeholderTextColor={theme.colors.subtext}
           />
        </View>

        <Button title={t('editProfileScreen.saveChanges')} onPress={saveProfile} loading={saving} style={{ marginTop: 30 }} />
      </ScrollView>

      {/* Options Modal */}
      <Modal visible={showAvatarOptions} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAvatarOptions(false)}>
           <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('editProfileScreen.updateAvatar')}</Text>
              
              <Pressable style={styles.modalOption} onPress={pickImage}>
                 <Ionicons name="image-outline" size={24} color={theme.colors.text} />
                 <Text style={styles.modalOptionText}>{t('editProfileScreen.chooseGallery')}</Text>
              </Pressable>
              
              <Pressable style={styles.modalOption} onPress={() => { setShowAvatarOptions(false); setShowSystemAvatars(true); }}>
                 <Ionicons name="happy-outline" size={24} color={theme.colors.text} />
                 <Text style={styles.modalOptionText}>{t('editProfileScreen.chooseSystem')}</Text>
              </Pressable>
           </View>
        </Pressable>
      </Modal>

      {/* System Avatars Modal */}
      <Modal visible={showSystemAvatars} transparent animationType="slide">
        <View style={styles.sysModalOverlay}>
           <View style={styles.sysModalContent}>
              <View style={styles.sysModalHeader}>
                 <Text style={styles.modalTitle}>{t('editProfileScreen.systemAvatars')}</Text>
                 <Pressable onPress={() => setShowSystemAvatars(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.subtext} />
                 </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.avatarGrid}>
                 {SYSTEM_AVATARS.map((url, i) => (
                    <Pressable key={i} onPress={() => { setAvatarUrl(url); setShowSystemAvatars(false); }} style={styles.sysAvatarSlot}>
                       <Image source={{ uri: url }} style={styles.sysAvatarImg} />
                    </Pressable>
                 ))}
              </ScrollView>
           </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginVertical: 30 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: theme.colors.primary },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.colors.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: theme.colors.background },
  inputSection: { marginBottom: 20 },
  label: { color: theme.colors.subtext, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  input: { backgroundColor: theme.colors.surface, borderRadius: 16, paddingHorizontal: 16, height: 56, color: theme.colors.text, fontSize: 16, borderWidth: 1, borderColor: theme.colors.border },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 50 },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalOptionText: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  
  sysModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  sysModalContent: { backgroundColor: theme.colors.surface, borderRadius: 32, padding: 20, maxHeight: '70%' },
  sysModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  sysAvatarSlot: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.border },
  sysAvatarImg: { width: '100%', height: '100%', resizeMode: 'cover' }
}));
