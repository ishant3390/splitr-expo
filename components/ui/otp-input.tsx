import React, { useRef, useEffect } from "react";
import { View, TextInput, Pressable } from "react-native";
import { clsx } from "clsx";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function OTPInput({ length = 6, value, onChange, className }: OTPInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const digits = value.split("").concat(Array(length - value.length).fill(""));

  useEffect(() => {
    // Auto-focus first empty field
    const nextEmpty = value.length < length ? value.length : length - 1;
    inputRefs.current[nextEmpty]?.focus();
  }, []);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const pastedValue = text.slice(0, length);
      onChange(pastedValue);
      const focusIdx = Math.min(pastedValue.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const newValue = digits.slice(0, length);
    newValue[index] = text;
    const joined = newValue.join("").slice(0, length);
    onChange(joined);

    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newValue = digits.slice(0, length);
      newValue[index - 1] = "";
      onChange(newValue.join(""));
    }
  };

  return (
    <View className={clsx("flex-row gap-2 justify-center", className)}>
      {digits.slice(0, length).map((digit, index) => (
        <Pressable
          key={index}
          onPress={() => inputRefs.current[index]?.focus()}
        >
          <TextInput
            ref={(ref) => { inputRefs.current[index] = ref; }}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={index === 0 ? length : 1}
            selectTextOnFocus
            accessibilityLabel={`Digit ${index + 1} of ${length}`}
            className={clsx(
              "w-12 h-14 rounded-xl text-center text-xl font-sans-bold",
              digit
                ? "bg-primary/10 border-2 border-primary text-foreground"
                : "bg-muted border-2 border-transparent text-foreground"
            )}
          />
        </Pressable>
      ))}
    </View>
  );
}
