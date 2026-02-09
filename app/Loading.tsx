import React from 'react';
import { StyleSheet, View } from 'react-native';
import Applogo from '../src/components/applogo';
import { Colors } from '../src/constants/Colors';

const Loading = () => {
  return (
    <View style={styles.container}>
      <Applogo width={200} height={200} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Loading;
