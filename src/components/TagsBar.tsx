import { useUser } from '@clerk/clerk-expo';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useTags } from '../hooks/useEvents';
import { useSupabaseClient } from '../lib/supabaseConfig';
import { TagPill } from './TagPill';

interface TagsBarProps {
  activeTag: string;
  onTagPress: (tag: string) => void;
}

const shuffleArray = (items: string[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildMixedTags = (interests: string[], others: string[], limit: number) => {
  const interestPool = shuffleArray(interests);
  const otherPool = shuffleArray(others);
  const result: string[] = [];
  let i = 0;
  let o = 0;

  while (result.length < limit && (i < interestPool.length || o < otherPool.length)) {
    const useInterest =
      i < interestPool.length && (o >= otherPool.length || Math.random() < 0.7);

    if (useInterest) {
      result.push(interestPool[i]);
      i += 1;
    } else if (o < otherPool.length) {
      result.push(otherPool[o]);
      o += 1;
    }
  }

  return result;
};

export const TagsBar = React.memo(({ activeTag, onTagPress }: TagsBarProps) => {
  const { tags, tagObjects, loading } = useTags();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [personalizedTags, setPersonalizedTags] = useState<string[]>([]);
  const [isPersonalizing, setIsPersonalizing] = useState(true);

  useEffect(() => {
    async function personalizeTags() {
      const pinnedTags = tags.slice(0, 2).filter(Boolean);
      const restTags = tags.slice(pinnedTags.length);

      if (!user || tags.length === 0) {
        const mixed = shuffleArray(restTags).slice(0, Math.max(0, 10 - pinnedTags.length));
        setPersonalizedTags([...pinnedTags, ...mixed]);
        setIsPersonalizing(false);
        return;
      }

      try {
        // Fetch user's interested tags
        const { data: userData } = await supabase
          .from('users')
          .select('interested_tags')
          .eq('id', user.id)
          .single();

        const userInterests = userData?.interested_tags || [];

        if (userInterests.length === 0) {
          const mixed = shuffleArray(restTags).slice(0, Math.max(0, 10 - pinnedTags.length));
          setPersonalizedTags([...pinnedTags, ...mixed]);
        } else {
          // Find the labels for user's interested tags
          const interestedLabels = tagObjects
            .filter(t => userInterests.includes(t.name))
            .map(t => t.label);

          // Get other tags not in user interests
          const availableInterestLabels = restTags.filter(tag => interestedLabels.includes(tag));
          const otherTags = restTags.filter(tag => !availableInterestLabels.includes(tag));

          // Mix: keep some interests with a bit of discovery
          const mixed = buildMixedTags(
            availableInterestLabels,
            otherTags,
            Math.max(0, 10 - pinnedTags.length)
          );
          setPersonalizedTags([...pinnedTags, ...mixed]);
        }
      } catch (error) {
        console.error('Error personalizing tags:', error);
        const mixed = shuffleArray(restTags).slice(0, Math.max(0, 10 - pinnedTags.length));
        setPersonalizedTags([...pinnedTags, ...mixed]);
      } finally {
        setIsPersonalizing(false);
      }
    }

    personalizeTags();
  }, [user, tags, tagObjects, supabase]);

  if (loading || isPersonalizing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent } 
      >
      {personalizedTags.map((tag) => (
          <TagPill
            key={tag}
            label={tag}
            isActive={activeTag === tag}
            onPress={() => onTagPress(tag)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
   
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
});
