import * as React from "react";
import Svg, { Path, Rect, SvgProps } from "react-native-svg";
const Applogo = (props: SvgProps) => (
  <Svg
    width={124}
    height={164}
    viewBox="0 0 124 164"
    fill="none"
    {...props}
  >
    <Rect
      y={109.333}
      width={54.6667}
      height={54.6667}
      rx={27.3333}
      fill="white"
    />
    <Path
      d="M123.976 27.3333C123.976 12.2375 111.739 0 96.6427 0C81.547 0 69.3094 12.2375 69.3094 27.3333V164C99.501 164 123.976 139.525 123.976 109.333V27.3333Z"
      fill="white"
    />
  </Svg>
);
export default Applogo;
