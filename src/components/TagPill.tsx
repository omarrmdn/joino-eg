import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';

interface TagPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

export const TagPill = ({ label, isActive, onPress }: TagPillProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        isActive ? styles.pillActive : styles.pillInactive
      ]}
    >
      <Text style={[
        styles.label,
        isActive ? styles.labelActive : styles.labelInactive
      ]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: Colors.white,
  },
  pillInactive: {
    backgroundColor: Colors.lightblack,
    
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  labelActive: {
    color: Colors.black,
  },
  labelInactive: {
    color: Colors.white, 
  },
});
