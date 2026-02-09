import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface LocationPillProps {
  location: string;
}

export const LocationPill = ({ location }: LocationPillProps) => {
  return (
    <View style={styles.container}>
      <Ionicons name="location-outline" size={14} color={Colors.white} />
      <Text style={styles.text}>{location}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    color: Colors.white,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});
