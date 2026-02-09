import * as React from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { Colors } from "../../src/constants/Colors";
const AppIcon = (props: any) => (
  <Svg
    width={300}
    height={300}
    viewBox="0 0 300 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <Rect width={300} height={300} fill={Colors.primary} />
    <Rect
      x={89.5239}
      y={176.667}
      width={53.3333}
      height={53.3333}
      rx={26.6667}
      fill={Colors.white}
    />
    <Path
      d="M210.476 96.6667C210.476 81.9391 198.537 70 183.809 70C169.082 70 157.143 81.9391 157.143 96.6667V230C186.598 230 210.476 206.122 210.476 176.667V96.6667Z"
      fill={Colors.white}
    />
  </Svg>
);
export default AppIcon;
