import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useLanguage } from "../lib/i18n";
import { Button } from "./Button";

interface RatingBottomSheetProps {
  visible: boolean;
  eventTitle?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void> | void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const RatingBottomSheet = ({
  visible,
  eventTitle,
  onClose,
  onSubmit,
}: RatingBottomSheetProps) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = rating > 0 && !submitting;

  const titleText = useMemo(() => {
    if (eventTitle) {
      const base = t("rating_title_generic") || "Rate this event";
      return `${base}: ${eventTitle}`;
    }
    return t("rating_title_generic") || "Rate this event";
  }, [eventTitle, t]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      setRating(0);
      setComment("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const renderStar = (index: number) => {
    const isActive = index <= rating;
    return (
      <TouchableOpacity
        key={index}
        onPress={() => setRating(index)}
        activeOpacity={0.8}
        style={styles.starButton}
        accessibilityRole="button"
        accessibilityLabel={`Rate ${index} star`}
      >
        <Ionicons
          name={isActive ? "star" : "star-outline"}
          size={32}
          color={isActive ? Colors.primary : Colors.gray}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.content}>
            <Text style={styles.title}>{titleText}</Text>
            <Text style={styles.subtitle}>
              {t("rating_subtitle") || "How was your experience?"}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(renderStar)}
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder={t("rating_placeholder") || "Share an optional comment"}
              placeholderTextColor={Colors.gray}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={400}
            />

            <Button
              title={submitting ? t("rating_submitting") || "Submitting..." : t("rating_submit") || "Submit rating"}
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                styles.submitButton,
                !canSubmit && styles.submitButtonDisabled,
              ]}
            />

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.skipButton}
            >
              <Text style={styles.skipButtonText}>
                {t("rating_skip") || "Not now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blackTransparentLight,
  },
  sheet: {
    backgroundColor: Colors.black,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    minHeight: SCREEN_HEIGHT * 0.45,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.whiteTransparent,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 6,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  starButton: {
    padding: 6,
  },
  commentInput: {
    backgroundColor: Colors.lightblack,
    borderRadius: 12,
    padding: 14,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 14,
    height: 110,
    textAlignVertical: "top",
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.whiteTransparentVeryLight,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 25,
    marginTop: 18,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  skipButton: {
    alignSelf: "center",
    marginTop: 14,
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
});
