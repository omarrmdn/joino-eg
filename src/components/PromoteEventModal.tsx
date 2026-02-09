import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { useLanguage } from '../lib/i18n';
import { Button } from './Button';
import LoudSpeaker from './LoudSpeaker';

interface PromoteEventModalProps {
  visible: boolean;
  onClose: () => void;
  onBoost: () => void;
  onChooseBudget?: () => void;
}

const { width } = Dimensions.get('window');

export const PromoteEventModal = ({ visible, onClose, onBoost, onChooseBudget }: PromoteEventModalProps) => {
  const { t } = useLanguage();
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalView}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.gray} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <LoudSpeaker width={120} height={120} />
            </View>

            <Text style={styles.title}>
              {t("promote_modal_title")}
            </Text>

            <Text style={styles.subtitle}>
              {t("promote_modal_subtitle")}
            </Text>

            <Button
              title={t("promote_modal_boost_button")}
              onPress={onBoost}
              style={styles.boostButton}
            />

            <TouchableOpacity 
              onPress={() => {
                if (onChooseBudget) {
                  onChooseBudget();
                } else {
                  onClose();
                }
              }} 
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryActionText}>{t("promote_modal_secondary_action")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    width: width * 0.9,
    backgroundColor: Colors.black,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.primaryTransparent,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  iconContainer: {
    marginBottom: 20,
    transform: [{ rotate: '-10deg' }], 
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  boostButton: {
    width: '100%',
    marginBottom: 15,
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    padding: 10,
  },
  secondaryActionText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.semibold,
    textDecorationLine: 'underline',
  },
});
