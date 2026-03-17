import React, { useCallback } from "react";
import { Modal, Pressable, Platform, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

export const SPRING_CONFIG = { damping: 20, stiffness: 300 };
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

// --- Gesture logic extracted for testability ---

export interface GestureSharedValues {
  scale: { value: number };
  savedScale: { value: number };
  translateX: { value: number };
  translateY: { value: number };
  savedTranslateX: { value: number };
  savedTranslateY: { value: number };
}

export function handlePinchUpdate(
  sv: GestureSharedValues,
  eventScale: number
) {
  const newScale = sv.savedScale.value * eventScale;
  sv.scale.value = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
}

export function handlePinchEnd(
  sv: GestureSharedValues,
  resetFn: () => void
) {
  sv.savedScale.value = sv.scale.value;
  if (sv.scale.value < 1.05) {
    resetFn();
  }
}

export function handlePanUpdate(
  sv: GestureSharedValues,
  translationX: number,
  translationY: number
) {
  if (sv.savedScale.value > 1) {
    sv.translateX.value = sv.savedTranslateX.value + translationX;
    sv.translateY.value = sv.savedTranslateY.value + translationY;
  }
}

export function handlePanEnd(sv: GestureSharedValues) {
  sv.savedTranslateX.value = sv.translateX.value;
  sv.savedTranslateY.value = sv.translateY.value;
  if (sv.savedScale.value <= 1) {
    sv.translateX.value = 0;
    sv.translateY.value = 0;
    sv.savedTranslateX.value = 0;
    sv.savedTranslateY.value = 0;
  }
}

export function handleDoubleTap(
  sv: GestureSharedValues,
  resetFn: () => void
) {
  if (sv.scale.value > 1.05) {
    resetFn();
  } else {
    sv.scale.value = 2;
    sv.savedScale.value = 2;
  }
}

/**
 * Full-screen image preview modal with pinch-to-zoom, pan, and double-tap.
 * On web, renders a simpler CSS-based preview (no gesture handler).
 */
export function ImagePreviewModal({
  visible,
  imageUri,
  onClose,
}: ImagePreviewModalProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetTransform = useCallback(() => {
    "worklet";
    scale.value = withSpring(1, SPRING_CONFIG);
    savedScale.value = 1;
    translateX.value = withSpring(0, SPRING_CONFIG);
    translateY.value = withSpring(0, SPRING_CONFIG);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const handleClose = useCallback(() => {
    resetTransform();
    onClose();
  }, [resetTransform, onClose]);

  // --- Native gestures ---

  const sv: GestureSharedValues = {
    scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY,
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      handlePinchUpdate(sv, e.scale);
    })
    .onEnd(() => {
      handlePinchEnd(sv, resetTransform);
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      handlePanUpdate(sv, e.translationX, e.translationY);
    })
    .onEnd(() => {
      handlePanEnd(sv);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      handleDoubleTap(sv, resetTransform);
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!imageUri) return null;

  // Web: simpler implementation without gesture handler
  if (Platform.OS === "web") {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable
          onPress={handleClose}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Close button */}
          <Pressable
            onPress={handleClose}
            accessibilityLabel="Close image preview"
            accessibilityRole="button"
            style={{
              position: "absolute",
              top: 48,
              right: 16,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={24} color="#ffffff" />
          </Pressable>

          <Pressable onPress={(e) => e.stopPropagation()}>
            <Image
              source={{ uri: imageUri }}
              style={{
                width: screenWidth * 0.9,
                height: screenHeight * 0.75,
              }}
              contentFit="contain"
            />
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // Native: gesture-enabled implementation
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)",
        }}
      >
        {/* Close button */}
        <Pressable
          onPress={handleClose}
          accessibilityLabel="Close image preview"
          accessibilityRole="button"
          style={{
            position: "absolute",
            top: 48,
            right: 16,
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={24} color="#ffffff" />
        </Pressable>

        {/* Zoomable image */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              },
              animatedStyle,
            ]}
          >
            <Image
              source={{ uri: imageUri }}
              style={{
                width: screenWidth,
                height: screenHeight * 0.8,
              }}
              contentFit="contain"
            />
          </Animated.View>
        </GestureDetector>
      </SafeAreaView>
    </Modal>
  );
}
