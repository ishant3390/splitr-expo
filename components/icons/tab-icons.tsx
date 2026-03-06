import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";

interface TabIconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

/**
 * Airbnb-style tab icons with outline (inactive) and filled (active) variants.
 * Each icon is a hand-crafted SVG for pixel-perfect rendering at small sizes.
 */

export function HomeIcon({ size = 24, color = "#94a3b8", filled = false }: TabIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 10.182V21a1 1 0 001 1h5a1 1 0 001-1v-5a2 2 0 014 0v5a1 1 0 001 1h5a1 1 0 001-1V10.182a1 1 0 00-.364-.768l-9-7.5a1 1 0 00-1.272 0l-9 7.5A1 1 0 003 10.182z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.182V21a1 1 0 001 1h5a1 1 0 001-1v-5a2 2 0 014 0v5a1 1 0 001 1h5a1 1 0 001-1V10.182a1 1 0 00-.364-.768l-9-7.5a1 1 0 00-1.272 0l-9 7.5A1 1 0 003 10.182z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GroupsIcon({ size = 24, color = "#94a3b8", filled = false }: TabIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={9} cy={7} r={3.5} fill={color} />
        <Path
          d="M2 19.5c0-3.038 2.686-5.5 6-5.5h2c3.314 0 6 2.462 6 5.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 19.5z"
          fill={color}
        />
        <Circle cx={17.5} cy={8.5} r={2.5} fill={color} />
        <Path
          d="M17.5 14c2.21 0 4 1.79 4 4a1.5 1.5 0 01-1.5 1.5h-2.5"
          fill={color}
        />
        <Path
          d="M17.5 14c2.21 0 4 1.79 4 4a1.5 1.5 0 01-1.5 1.5h-2.5"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={7} r={3.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M2 19.5c0-3.038 2.686-5.5 6-5.5h2c3.314 0 6 2.462 6 5.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 19.5z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Circle cx={17.5} cy={8.5} r={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M17.5 14c2.21 0 4 1.79 4 4a1.5 1.5 0 01-1.5 1.5h-2.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ActivityIcon({ size = 24, color = "#94a3b8", filled = false }: TabIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x={3} y={3} width={18} height={18} rx={3} fill={color} />
        <Path
          d="M7 12h2l1.5-3 3 6L15 12h2"
          stroke={filled ? "#ffffff" : color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={3}
        width={18}
        height={18}
        rx={3}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M7 12h2l1.5-3 3 6L15 12h2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ProfileIcon({ size = 24, color = "#94a3b8", filled = false }: TabIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={4} fill={color} />
        <Path
          d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6a1 1 0 01-1 1H5a1 1 0 01-1-1z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6a1 1 0 01-1 1H5a1 1 0 01-1-1z"
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  );
}
