import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface PromotedButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
}

export const PromotedButton = ({ onPress, title, style }: PromotedButtonProps) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { 
        duration: 2500, 
        easing: Easing.linear 
      }),
      -1,
      false
    );
  }, []);

  // Calculate path length for the dashed border: 2*w + 2*h (roughly for a pill)
  const pathLength = dimensions.width > 0 ? (dimensions.width * 2) + (dimensions.height * 2) : 0;
  
  const animatedProps = useAnimatedProps(() => {
    return {
      // Dash offset slides the dash segment along the path
      strokeDashoffset: -progress.value * pathLength,
    };
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress} 
      style={[styles.container, style]}
      onLayout={onLayout}
    >
      <View style={styles.innerWrapper}>
        {dimensions.width > 0 && (
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="outlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={Colors.primary} stopOpacity="1" />
                <Stop offset="50%" stopColor={Colors.darkflame} stopOpacity="0.5" />
                <Stop offset="100%" stopColor={Colors.primary} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            {/* Background border path */}
            <Rect
              x="1"
              y="1"
              width={dimensions.width - 2}
              height={dimensions.height - 2}
              rx={dimensions.height / 2}
              stroke={Colors.primaryTransparentDark}
              strokeWidth="2.5"
              fill="transparent"
            />
            {/* The animated light path */}
            <AnimatedRect
              x="1"
              y="1"
              width={dimensions.width - 2}
              height={dimensions.height - 2}
              rx={dimensions.height / 2}
              stroke="url(#outlineGrad)"
              strokeWidth="2.5"
              fill="transparent"
              strokeDasharray={[pathLength * 0.3, pathLength * 0.7]}
              animatedProps={animatedProps}
            />
          </Svg>
        )}
        
        <View style={styles.content}>
           <Text style={styles.text}>{title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 55, 
    width: '100%',
    marginVertical: 10,
  },
  innerWrapper: {
    flex: 1,
    borderRadius: 27.5,
    overflow: 'hidden',
    backgroundColor: Colors.black,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.darkflame,
    margin: 2, 
    borderRadius: 25.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
});
