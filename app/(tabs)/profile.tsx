import { useAuth, useUser } from "@clerk/clerk-expo";
import { FontAwesome6, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeInRight,
    Layout,
} from "react-native-reanimated";
import { Colors } from "../../src/constants/Colors";
import { PROMOTIONS_ENABLED } from "../../src/constants/FeatureFlags";
import { Fonts } from "../../src/constants/Fonts";
import { useTags } from "../../src/hooks/useEvents";
import { useUserAnalytics } from "../../src/hooks/useUserAnalytics";
import { useAlert } from "../../src/lib/AlertContext";
import { useLanguage } from "../../src/lib/i18n";
import { useSupabaseClient } from "../../src/lib/supabaseConfig";

export default function ProfileScreen() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const supabase = useSupabaseClient();
  const { userData, loading: analyticsLoading, error: analyticsError, updateInterests, refetch } = useUserAnalytics();
  const { tagObjects, loading: tagsLoading } = useTags();
  const [isEditingInterests, setIsEditingInterests] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { t, language } = useLanguage();
  const { showAlert, showToast } = useAlert();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleInterest = async (tagName: string) => {
    try {
      const currentInterests = userData?.interested_tags || [];
      let newInterests;
      if (currentInterests.includes(tagName)) {
        newInterests = currentInterests.filter(t => t !== tagName);
      } else {
        newInterests = [...currentInterests, tagName];
      }
      await updateInterests(newInterests);
    } catch (error) {
       showAlert({
         title: t("profile_update_failed"),
         message: t("profile_update_failed_msg"),
         type: 'error',
       });
    }
  };

  const handleEditProfile = () => {
    setTempName(userData?.name || user?.fullName || "");
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!tempName.trim()) {
      showAlert({
        title: t("error_title"),
        message: t("profile_name_empty"),
        type: 'warning',
      });
      return;
    }

    try {
      setIsUpdating(true);
      
      // Update Supabase
      const { error: dbError } = await supabase
        .from("users")
        .update({ name: tempName.trim() })
        .eq("id", user.id);
      
      if (dbError) throw dbError;

      // Update Clerk (optional but good for consistency)
      const [firstName, ...rest] = tempName.trim().split(" ");
      const lastName = rest.join(" ");
      await user.update({
        firstName,
        lastName: lastName || undefined,
      });
      
      await refetch();
      setIsEditingProfile(false);
      showToast({
        message: t("profile_update_success"),
        type: 'success',
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      showAlert({
        title: t("error_title"),
        message: t("profile_update_profile_failed"),
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
          showAlert({
            title: t("profile_permission_photos"),
            message: t("profile_permission_photos_msg"),
            type: 'warning',
          });
          return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // 5MB limit check (optional but good as user requested)
        if (selectedAsset.fileSize && selectedAsset.fileSize > 5 * 1024 * 1024) {
           showAlert({
             title: t("profile_file_too_large"),
             message: t("profile_file_too_large_msg"),
             type: 'warning',
           });
           return;
        }

        setIsUpdating(true);
        const imageUri = selectedAsset.uri;
        
        const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
        const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

        console.log(`[Profile Update] Starting manual upload for: ${fileName}`);

        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: fileName,
          type: contentType,
        } as any);

        const token = await getToken({ template: 'supabase' });
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        
        console.log(`[Profile Update] Uploading to ${supabaseUrl}/storage/v1/object/user_pfp/${fileName}`);

        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/user_pfp/${fileName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-upsert': 'true',
            // DO NOT set Content-Type here, let fetch handle multipart/form-data boundary
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`[Profile Update] Upload failed: ${uploadResponse.status} - ${errorText}`);
          throw new Error(`Upload failed: ${errorText}`);
        }

        const uploadData = await uploadResponse.json();
        console.log("[Profile Update] Upload Success:", uploadData);

        // 2. Get Public URL (standard Supabase SDK call is fine here)
        const { data: publicUrlData } = supabase.storage
          .from("user_pfp")
          .getPublicUrl(fileName); // Use fileName or path from response
        
        const publicUrl = publicUrlData.publicUrl;
        console.log("[Profile Update] Public URL generated:", publicUrl);

        // 3. Update Supabase users table
        if (user?.id) {
          const { error: dbError } = await supabase
            .from("users")
            .update({ image_url: publicUrl })
            .eq("id", user.id);
          
          if (dbError) throw dbError;
        }

        // 4. Force refetch user data
        await refetch();

        if (!isEditingProfile) {
          showToast({
            message: t("profile_update_success"),
            type: 'success',
          });
        }
      }
    } catch (error: any) {
      console.error("Error updating profile image:", error);
      showAlert({
        title: t("error_title"),
        message: error.message || t("profile_update_image_failed"),
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };


  if (analyticsLoading || tagsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {analyticsError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {t("profile_load_failed")}
          </Text>
        </View>
      )}

      {/* Profile Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={isEditingProfile ? handleSaveProfile : handleEditProfile}
            style={styles.profileEditButton}
            disabled={isUpdating}
          >
             {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
             ) : (
                <Ionicons 
                  name={isEditingProfile ? "checkmark-circle" : "create-outline"} 
                  size={24} 
                  color={Colors.primary} 
                />
             )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={pickImage} 
          disabled={isUpdating}
          style={styles.avatarContainer}
        >
          <Image 
            source={{ uri: userData?.image_url || user?.imageUrl || 'https://via.placeholder.com/150' }} 
            style={styles.avatar} 
          />
          {isEditingProfile && (
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={20} color={Colors.white} />
            </View>
          )}
        </TouchableOpacity>

        {isEditingProfile ? (
          <TextInput
            style={styles.nameInput}
            value={tempName}
            onChangeText={setTempName}
            placeholder={t("profile_name_placeholder")}
            placeholderTextColor={Colors.textSecondary}
          />
        ) : (
          <Text style={styles.name}>{userData?.name || user?.fullName || t("profile_user_name_fallback")}</Text>
        )}
        
        <Text style={styles.email}>{userData?.email || user?.primaryEmailAddress?.emailAddress}</Text>
      </Animated.View>

      {/* Analytics Stats */}
      <View style={styles.statsContainer}>
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.statCard}>
          <Text style={styles.statLabel}>{t("profile_total_spend")}</Text>
          <Text style={styles.statValue}>${userData?.total_spend?.toFixed(2) || '0.00'}</Text>
        </Animated.View>
        <View style={styles.statSeparator} />
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statCard}>
          <Text style={styles.statLabel}>{t("profile_total_revenue")}</Text>
          <Text style={styles.statValue}>${userData?.total_revenue?.toFixed(2) || '0.00'}</Text>
        </Animated.View>
        {PROMOTIONS_ENABLED && (
          <>
            <View style={styles.statSeparator} />
            <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.statCard}>
              <MaterialCommunityIcons name="advertisements" size={30} color={Colors.primary} />
              <Text style={styles.adCenterLabel}>{t("profile_ad_center")}</Text>
            </Animated.View>
          </>
        )}
      </View>

      {/* Interests Section */}
      <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("profile_interests")}</Text>
          <TouchableOpacity onPress={() => setIsEditingInterests(!isEditingInterests)}>
            <Text style={styles.editButton}>
              {isEditingInterests ? t("profile_done") : t("profile_edit")}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.tagsContainer}>
          {isEditingInterests ? (
            tagObjects.map((tagObj, index) => (
              <Animated.View 
                key={tagObj.id} 
                entering={FadeInRight.delay(index * 50)}
                layout={Layout.springify()}
              >
                <TouchableOpacity 
                  style={[
                    styles.tag, 
                    userData?.interested_tags?.includes(tagObj.name) && styles.tagSelected
                  ]}
                  onPress={() => toggleInterest(tagObj.name)}
                >
                  <Text style={[
                    styles.tagText,
                    userData?.interested_tags?.includes(tagObj.name) && styles.tagTextSelected
                  ]}>
                    {tagObj.label}
                  </Text>
                  <Ionicons 
                    name={userData?.interested_tags?.includes(tagObj.name) ? "checkmark-circle" : "add-circle-outline"} 
                    size={16} 
                    color={userData?.interested_tags?.includes(tagObj.name) ? Colors.white : Colors.textSecondary} 
                    style={styles.tagIcon}
                  />
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            (userData?.interested_tags || []).map((tagName, index) => {
              const tagObj = tagObjects.find(t => t.name === tagName);
              const displayLabel = tagObj ? tagObj.label : tagName;
              return (
                <Animated.View 
                  key={tagName} 
                  entering={FadeInRight.delay(index * 50)}
                  layout={Layout.springify()}
                >
                  <View style={[styles.tag, styles.tagReadOnly, styles.tagSelected]}>
                    <Text style={[styles.tagText, styles.tagTextSelected]}>
                      {displayLabel}
                    </Text>
                  </View>
                </Animated.View>
              );
            })
          )}
          {!isEditingInterests && (!userData?.interested_tags || userData.interested_tags.length === 0) && (
            <Text style={styles.emptyText}>{t("profile_no_interests")}</Text>
          )}
        </View>
      </Animated.View>

      {/* Account Settings (Placeholder) */}
      <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/settings" as any)}
        >
          <Ionicons name="settings-outline" size={24} color={Colors.white} />
          <Text style={styles.menuItemText}>{t("profile_settings")}</Text>
          <Ionicons name={language === 'ar' ? "chevron-back" : "chevron-forward"} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.white} />
          <Text style={styles.menuItemText}>{t("profile_support")}</Text>
          <Ionicons name={language === 'ar' ? "chevron-back" : "chevron-forward"} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Follow Us Section */}
      <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.followSection}>
        <View style={styles.followHeader}>
          <View style={styles.followLine} />
          <Text style={styles.followTitle}>{t("profile_follow_us")}</Text>
          <View style={styles.followLine} />
        </View>
        <View style={styles.socialIconsRow}>
          <TouchableOpacity 
            style={styles.socialIconContainer}
            onPress={() => Linking.openURL('https://instagram.com/eventaat')}
          >
            <Ionicons name="logo-instagram" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialIconContainer}
            onPress={() => Linking.openURL('https://tiktok.com/@eventaat')}
          >
            <Ionicons name="logo-tiktok" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialIconContainer}
            onPress={() => Linking.openURL('https://x.com/eventaat')}
          >
            <FontAwesome6 name="x-twitter" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 10,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 5,
  },
  name: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 5,
  },
  nameInput: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    minWidth: 200,
    textAlign: 'center',
    paddingBottom: 5,
  },
  headerTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  profileEditButton: {
    padding: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 5,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  email: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 72,
  },
  statSeparator: {
    width: 1,
    backgroundColor: Colors.mediumGray,
    height: '60%',
    alignSelf: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  adCenterLabel: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  statValue: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  editButton: {
    color: Colors.primary,
    fontFamily: Fonts.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightblack,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagReadOnly: {
    opacity: 0.9,
  },
  tagText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
  },
  tagTextSelected: {
    color: Colors.white,
  },
  tagIcon: {
    marginLeft: 6,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.white,
    marginLeft: 15,
  },
  followSection: {
    marginTop: 10,
    alignItems: 'center',
    paddingBottom: 20,
  },
  followHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
    paddingHorizontal: 10,
  },
  followLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  followTitle: {
    fontSize: 18,
    fontFamily: Fonts.medium,
    color: Colors.white,
    marginHorizontal: 15,
  },
  socialIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
  },
  socialIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.darkflame,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 50, 4, 0.2)',
  },
});
