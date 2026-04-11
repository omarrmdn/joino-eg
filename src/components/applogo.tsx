import * as React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

interface ApplogoProps {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}

const Applogo = ({ width = 103, height = 32, style }: ApplogoProps) => (
  <Image
    source={require("../../assets/logoredsharp.png")}
    style={[{ width, height, resizeMode: "contain" }, style]}
  />
);

export default Applogo;
