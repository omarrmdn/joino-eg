import * as React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

interface TopbarLogoProps {
  style?: StyleProp<ImageStyle>;
}

const TopbarLogo = ({ style }: TopbarLogoProps) => (
  <Image
    source={require("../../assets/logoredsharp.png")}
    style={[{ width: 103, height: 32, resizeMode: "contain" }, style]}
  />
);

export default TopbarLogo;
