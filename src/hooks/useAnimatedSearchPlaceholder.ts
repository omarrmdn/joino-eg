import { useUser } from "@clerk/clerk-expo";
import { useEffect, useMemo, useState } from "react";
import { useTags } from "./useEvents";
import { useLanguage } from "../lib/i18n";
import { useSupabaseClient } from "../lib/supabaseConfig";

const shuffle = (items: string[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildMixedList = (interests: string[], others: string[], limit: number) => {
  const interestPool = shuffle(interests);
  const otherPool = shuffle(others);
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

interface AnimatedPlaceholderOptions {
  active?: boolean;
  maxItems?: number;
}

export const useAnimatedSearchPlaceholder = (options: AnimatedPlaceholderOptions = {}) => {
  const { active = true, maxItems = 6 } = options;
  const { t, language } = useLanguage();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { tags, tagObjects } = useTags();
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [placeholder, setPlaceholder] = useState(t("search_placeholder"));

  useEffect(() => {
    let isMounted = true;
    async function loadInterests() {
      if (!user) {
        if (isMounted) setUserInterests([]);
        return;
      }

      try {
        const { data } = await supabase
          .from("users")
          .select("interested_tags")
          .eq("id", user.id)
          .single();

        if (isMounted) {
          setUserInterests(data?.interested_tags || []);
        }
      } catch (error) {
        console.warn("Failed to load user interests for placeholder:", error);
        if (isMounted) setUserInterests([]);
      }
    }

    loadInterests();
    return () => {
      isMounted = false;
    };
  }, [user, supabase]);

  useEffect(() => {
    const baseTags = tags.slice(2); // remove "All" and "Near me"
    const interestedLabels = tagObjects
      .filter((tag) => userInterests.includes(tag.name))
      .map((tag) => tag.label);
    const otherTags = baseTags.filter((tag) => !interestedLabels.includes(tag));

    const mixed = buildMixedList(interestedLabels, otherTags, maxItems);
    const withFallback = mixed.length > 0 ? mixed : baseTags.slice(0, maxItems);
    const unique = Array.from(new Set([t("search_placeholder"), ...withFallback]));
    setPool(unique);
  }, [tags, tagObjects, userInterests, maxItems, t]);

  useEffect(() => {
    if (!active || pool.length === 0) {
      setPlaceholder(t("search_placeholder"));
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isMounted = true;

    const tick = () => {
      if (!isMounted) return;
      const word = pool[wordIndex % pool.length] || t("search_placeholder");

      if (isDeleting) {
        charIndex -= 1;
      } else {
        charIndex += 1;
      }

      const nextValue = word.substring(0, charIndex);
      setPlaceholder(nextValue.length > 0 ? nextValue : " ");

      if (!isDeleting && charIndex >= word.length) {
        isDeleting = true;
        timeout = setTimeout(tick, 900);
        return;
      }

      if (isDeleting && charIndex <= 0) {
        isDeleting = false;
        wordIndex += 1;
        timeout = setTimeout(tick, 350);
        return;
      }

      timeout = setTimeout(tick, isDeleting ? 45 : 75);
    };

    timeout = setTimeout(tick, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [active, pool, t, language]);

  return placeholder;
};
