import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { useLanguage } from '../lib/i18n';
import { Button } from './Button';

interface PromotionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (price: number, fillAllSeats: boolean) => void;
  initialPrice?: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PromotionBottomSheet = ({
  visible,
  onClose,
  onContinue,
  initialPrice = 300,
}: PromotionBottomSheetProps) => {
  const { t } = useLanguage();
  const [fillAllSeats, setFillAllSeats] = useState(false);
  const [price, setPrice] = useState(initialPrice.toString());

  useEffect(() => {
    if (fillAllSeats) {
      // If fill all seats is on, price is fixed/not negotiable
      // Based on user prompt: "then the price will be showed automatically 'not negotiable'"
      setPrice("300"); // Setting a default/fixed price as per image
    }
  }, [fillAllSeats]);

  const handleContinue = () => {
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
    onContinue(numericPrice, fillAllSeats);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
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
            <Text style={styles.label}>{t('promotion_price_title') || 'Price'}</Text>
            
            <View style={styles.priceContainer}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  editable={!fillAllSeats}
                  selectTextOnFocus={!fillAllSeats}
                />
              </View>
              <View style={styles.underline} />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('promotion_fill_seats') || 'Fill all seats'}</Text>
              <Switch
                value={fillAllSeats}
                onValueChange={setFillAllSeats}
                trackColor={{ false: Colors.darkGray, true: Colors.primary }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.darkGray}
              />
            </View>

            {fillAllSeats && (
              <Text style={styles.noteText}>{t('promotion_compliance_note')}</Text>
            )}

            <Button
              title={t('promotion_continue') || 'Continue To Purchase'}
              onPress={handleContinue}
              style={styles.continueButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blackTransparentLight,
  },
  sheet: {
    backgroundColor: Colors.black,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    minHeight: SCREEN_HEIGHT * 0.45,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.whiteTransparent,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  content: {
    paddingHorizontal: 25,
  },
  label: {
    color: Colors.gray,
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginBottom: 10,
  },
  priceContainer: {
    marginBottom: 40,
    alignSelf: 'flex-start',
    minWidth: 150,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    color: Colors.white,
    fontSize: 48,
    fontFamily: Fonts.bold,
  },
  priceInput: {
    color: Colors.white,
    fontSize: 48,
    fontFamily: Fonts.bold,
    marginLeft: 2,
    minWidth: 100,
    padding: 0,
  },
  underline: {
    height: 3,
    backgroundColor: Colors.gray,
    width: '100%',
    marginTop: 5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  switchLabel: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    height: 55,
    borderRadius: 27.5,
    marginVertical: 0,
  },
  noteText: {
    color: Colors.gray,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: -30,
    marginBottom: 30,
    lineHeight: 20,
  },
});
