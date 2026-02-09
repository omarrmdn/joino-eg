import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { CompactEventCard } from "./CompactEventCard";

interface HorizontalEventListProps {
  title: string;
  events: any[];
}

export const HorizontalEventList = React.memo(({ title, events }: HorizontalEventListProps) => {
  if (events.length === 0) return null;

  const renderItem = React.useCallback(({ item, index }: { item: any; index: number }) => (
    <CompactEventCard event={item} index={index} />
  ), []);

  const keyExtractor = React.useCallback((item: any, index: number) => `${item.id}-${index}`, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={276} // card width (260) + marginRight (16)
        decelerationRate="fast"
        initialNumToRender={5}
        windowSize={3}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  title: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.semibold,
    marginHorizontal: 15,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 15,
  },
});
