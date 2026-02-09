import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';

interface ButtonProps {
  onPress: () => void;
  title: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export const Button = ({ onPress, title, style, textStyle, disabled }: ButtonProps) => {
  return (
    <TouchableOpacity 
      style={[styles.button, style, disabled && styles.buttonDisabled]} 
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, textStyle, disabled && styles.buttonTextDisabled]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 200,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.black,
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  buttonTextDisabled: {
    opacity: 0.8,
  },
});
