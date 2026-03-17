import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

// Venmo — official Simple Icons logomark (white on brand blue)
export function VenmoIcon({ size = 20 }: IconProps) {
  const p = size / 24; // scale paths from 24x24 viewBox
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="5" fill="#008CFF" />
      <Path
        d="M19.8 4.4c.5.8.7 1.6.7 2.7 0 3.3-2.8 7.6-5.2 10.6H9.7L7.6 4.7l3.8-.4 1.2 9.5c1.1-1.7 2.3-4.4 2.3-6.3 0-1-.2-1.7-.4-2.3L19.8 4.4z"
        fill="#ffffff"
      />
    </Svg>
  );
}

// PayPal — official Simple Icons logomark (white on brand navy)
export function PayPalIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="5" fill="#003087" />
      <Path
        d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86"
        fill="#ffffff"
        opacity="0.5"
        transform="translate(2 3) scale(0.83)"
      />
      <Path
        d="M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"
        fill="#ffffff"
        transform="translate(2 3) scale(0.83)"
      />
      <Path
        d="M22.177 10.199c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 012.848 4.686"
        fill="#ffffff"
        opacity="0.7"
        transform="translate(2 3) scale(0.83)"
      />
    </Svg>
  );
}

// Cash App — official Simple Icons logomark (white on brand green)
export function CashAppIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="5" fill="#00C244" />
      <Path
        d="M23.59 3.475a5.1 5.1 0 00-3.05-3.05c-1.31-.42-2.5-.42-4.92-.42H8.36c-2.4 0-3.61 0-4.9.4a5.1 5.1 0 00-3.05 3.06C0 4.765 0 5.965 0 8.365v7.27c0 2.41 0 3.6.4 4.9a5.1 5.1 0 003.05 3.05c1.3.41 2.5.41 4.9.41h7.28c2.41 0 3.61 0 4.9-.4a5.1 5.1 0 003.06-3.06c.41-1.3.41-2.5.41-4.9v-7.25c0-2.41 0-3.61-.41-4.91zm-6.17 4.63l-.93.93a.5.5 0 01-.67.01 5 5 0 00-3.22-1.18c-.97 0-1.94.32-1.94 1.21 0 .9 1.04 1.2 2.24 1.65 2.1.7 3.84 1.58 3.84 3.64 0 2.24-1.74 3.78-4.58 3.95l-.26 1.2a.49.49 0 01-.48.39H9.63l-.09-.01a.5.5 0 01-.38-.59l.28-1.27a6.54 6.54 0 01-2.88-1.57v-.01a.48.48 0 010-.68l1-.97a.49.49 0 01.67 0c.91.86 2.13 1.34 3.39 1.32 1.3 0 2.17-.55 2.17-1.42 0-.87-.88-1.1-2.54-1.72-1.76-.63-3.43-1.52-3.43-3.6 0-2.42 2.01-3.6 4.39-3.71l.25-1.23a.48.48 0 01.48-.38h1.78l.1.01c.26.06.43.31.37.57l-.27 1.37c.9.3 1.75.77 2.48 1.39l.02.02c.19.2.19.5 0 .68z"
        fill="#ffffff"
      />
    </Svg>
  );
}

// Zelle — official Simple Icons logomark (white on brand purple)
export function ZelleIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="5" fill="#6D1ED4" />
      <Path
        d="M13.559 24h-2.841a.483.483 0 01-.483-.483v-2.765H5.638a.667.667 0 01-.666-.666v-2.234a.67.67 0 01.142-.412l8.139-10.382h-7.25a.667.667 0 01-.667-.667V3.914c0-.367.299-.666.666-.666h4.23V.483c0-.266.217-.483.483-.483h2.841c.266 0 .483.217.483.483v2.765h4.323c.367 0 .666.299.666.666v2.137a.67.67 0 01-.141.41l-8.19 10.481h7.665c.367 0 .666.299.666.666v2.477a.667.667 0 01-.666.667h-4.32v2.765a.483.483 0 01-.483.483Z"
        fill="#ffffff"
        transform="translate(3 3) scale(0.75)"
      />
    </Svg>
  );
}

// UPI — stylized chevron marks (white on brand purple)
export function UpiIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="5" fill="#4B286D" />
      <Path
        d="M6.5 5l4 14h1.5L7.5 5H6.5zm5 0l4 14H17L12.5 5H11.5z"
        fill="#ffffff"
      />
    </Svg>
  );
}

// Revolut — official Simple Icons logomark (white on brand blue)
export function RevolutIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="5" fill="#0075EB" />
      <Path
        d="M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 00-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z"
        fill="#ffffff"
        transform="translate(2 3) scale(0.83)"
      />
    </Svg>
  );
}

// Monzo — official Simple Icons logomark (white on brand coral)
export function MonzoIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="5" fill="#FF4B67" />
      <Path
        d="M4.244 1.174a.443.443 0 00-.271.13l-3.97 3.97-.001.001c3.884 3.882 8.093 8.092 11.748 11.748v-8.57L4.602 1.305a.443.443 0 00-.358-.131zm15.483 0a.443.443 0 00-.329.13L12.25 8.456v8.568L24 5.275c-1.316-1.322-2.647-2.648-3.97-3.97a.443.443 0 00-.301-.131zM0 5.979l.002 10.955c0 .294.118.577.326.785l4.973 4.976c.28.282.76.083.758-.314V12.037zm23.998.003l-6.06 6.061v10.338c-.004.399.48.6.76.314l4.974-4.976c.208-.208.326-.49.326-.785z"
        fill="#ffffff"
        transform="translate(3 3) scale(0.75)"
      />
    </Svg>
  );
}
