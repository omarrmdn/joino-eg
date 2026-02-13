import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../src/constants/Colors";
import { Fonts } from "../src/constants/Fonts";
import { useAlert } from "../src/lib/AlertContext";
import { useLanguage } from "../src/lib/i18n";
import { useSupabaseClient } from "../src/lib/supabaseConfig";

export default function ReportBugScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { t, language } = useLanguage();
  const supabase = useSupabaseClient();
  const { showAlert } = useAlert();
  
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: t("error_title"),
        message: t("profile_permission_photos_msg"),
        type: 'error',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 3,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...uris].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showAlert({
        title: t("error_title"),
        message: "Please describe the bug.",
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];

      for (const uri of images) {
        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `bug_${user?.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: fileName,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        } as any);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("bug_reports")
          .upload(fileName, formData);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("bug_reports")
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const { error: insertError } = await supabase
        .from("bug_reports")
        .insert({
          user_id: user?.id,
          description: description.trim(),
          images: uploadedUrls,
          status: 'open',
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      showAlert({
        title: "Success",
        message: "Your bug report has been submitted. Thank you for helping us improve!",
        type: 'success',
      });
      router.back();
    } catch (error: any) {
      console.error("Bug report error:", error);
      showAlert({
        title: "Error",
        message: error.message || "Failed to submit bug report. Please try again later.",
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={language === 'ar' || language === 'ar-EG' ? "chevron-forward" : "chevron-back"} size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report a Bug</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>What went wrong?</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe the issue in detail..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Add Screenshots (Max 3)</Text>
          <View style={styles.imageRow}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <TouchableOpacity 
                   style={styles.removeImageButton} 
                   onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 3 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color={Colors.primary} />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  backButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    backgroundColor: Colors.lightblack,
    borderRadius: 12,
    padding: 15,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 15,
    minHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: "relative",
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(255, 50, 4, 0.05)',
  },
  addImageText: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
