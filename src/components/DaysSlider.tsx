import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { useLanguage } from '../lib/i18n';

interface Day {
  date: string;
  dayNum: string;
  dayName: string;
}

interface DaysSliderProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  availableDates: string[];
}

export const DaysSlider = ({ selectedDate, onDateSelect, availableDates }: DaysSliderProps) => {
  const { t } = useLanguage();
  
  const days: Day[] = availableDates.map((dateStr) => {
    const d = new Date(dateStr);
    const isToday = dateStr === [
      new Date().getFullYear(),
      String(new Date().getMonth() + 1).padStart(2, '0'),
      String(new Date().getDate()).padStart(2, '0')
    ].join('-');

    return {
      date: dateStr,
      dayNum: d.getDate().toString(),
      dayName: isToday ? t('today') : d.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  });

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.container}
    >
      {days.map((item, index) => {
        const isSelected = selectedDate === item.date;
        return (
          <TouchableOpacity
            key={index}
            style={[styles.dayBox, isSelected && styles.selectedBox]}
            onPress={() => onDateSelect(item.date)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayNum, isSelected && styles.selectedText]}>{item.dayNum}</Text>
            <Text style={[styles.dayName, isSelected && styles.selectedText]}>{item.dayName}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 6,
  },
  dayBox: {
    width: 60,
    height: 75,
    borderRadius: 12,
    backgroundColor: Colors.darkflame,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedBox: {
    backgroundColor: Colors.primary,
  },
  dayNum: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  dayName: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  selectedText: {
    color: Colors.white,
  },
});
