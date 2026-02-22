import React, { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSignUp, useSignIn } from "@clerk/clerk-expo";
import { Button } from "@/components/ui/button";
import { OTPInput } from "@/components/ui/otp-input";
import { ArrowLeft, Mail, Phone as PhoneIcon, CheckCircle2 } from "lucide-react-native";

export default function OTPVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ contact: string; phone?: string; mode: string }>();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { signIn, setActive: setActiveSignIn } = useSignIn();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<"email" | "phone">("email");
  const [countdown, setCountdown] = useState(30);

  const isSignUp = params.mode === "signup";
  const displayContact = verifyMethod === "email" ? params.contact : params.phone;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < 6) {
      Alert.alert("Invalid Code", "Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        if (verifyMethod === "email") {
          const result = await signUp?.attemptEmailAddressVerification({ code: otp });
          if (result?.status === "complete" && result.createdSessionId) {
            setVerified(true);
            setTimeout(async () => {
              await setActiveSignUp?.({ session: result.createdSessionId! });
            }, 1500);
          }
        } else {
          const result = await signUp?.attemptPhoneNumberVerification({ code: otp });
          if (result?.status === "complete" && result.createdSessionId) {
            setVerified(true);
            setTimeout(async () => {
              await setActiveSignUp?.({ session: result.createdSessionId! });
            }, 1500);
          }
        }
      } else {
        // Sign in verification
        const result = await signIn?.attemptFirstFactor({
          strategy: verifyMethod === "email" ? "email_code" : "phone_code",
          code: otp,
        });
        if (result?.status === "complete" && result.createdSessionId) {
          setVerified(true);
          setTimeout(async () => {
            await setActiveSignIn?.({ session: result.createdSessionId! });
          }, 1500);
        }
      }
    } catch (err: any) {
      Alert.alert(
        "Verification Failed",
        err?.errors?.[0]?.longMessage || "Invalid code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      if (isSignUp) {
        if (verifyMethod === "email") {
          await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
        } else {
          await signUp?.preparePhoneNumberVerification({ strategy: "phone_code" });
        }
      } else {
        const factorKey = verifyMethod === "email" ? "email_code" : "phone_code";
        const factor = signIn?.supportedFirstFactors?.find(
          (f: any) => f.strategy === factorKey
        );
        if (factor) {
          await signIn?.prepareFirstFactor({
            strategy: factorKey,
            ...(factorKey === "email_code"
              ? { emailAddressId: (factor as any).emailAddressId }
              : { phoneNumberId: (factor as any).phoneNumberId }),
          });
        }
      }
      setCountdown(30);
      Alert.alert("Code Sent", `A new code has been sent to your ${verifyMethod}.`);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not resend code");
    }
  };

  const toggleMethod = async () => {
    const newMethod = verifyMethod === "email" ? "phone" : "email";
    setVerifyMethod(newMethod);
    setOtp("");
    setCountdown(30);
    try {
      if (isSignUp) {
        if (newMethod === "phone") {
          await signUp?.preparePhoneNumberVerification({ strategy: "phone_code" });
        } else {
          await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
        }
      }
    } catch {
      // fallback silently
    }
  };

  if (verified) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <View className="items-center gap-4 px-6">
          <View className="w-20 h-20 rounded-full bg-success/10 items-center justify-center">
            <CheckCircle2 size={44} color="#10b981" />
          </View>
          <Text className="text-2xl font-sans-bold text-foreground">Verified!</Text>
          <Text className="text-base text-muted-foreground font-sans text-center">
            Your account is verified. Redirecting to Splitr...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Button variant="ghost" size="icon" onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0f172a" />
        </Button>
        <Text className="flex-1 text-lg font-sans-semibold text-foreground text-center mr-10">
          Verify Account
        </Text>
      </View>

      <View className="flex-1 px-6">
        {/* Progress indicator */}
        <View className="flex-row items-center gap-2 mb-8 mt-4">
          <View className="flex-1 h-1 rounded-full bg-primary" />
          <View className="flex-1 h-1 rounded-full bg-primary" />
        </View>

        {/* Icon */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center">
            {verifyMethod === "email" ? (
              <Mail size={32} color="#0d9488" />
            ) : (
              <PhoneIcon size={32} color="#0d9488" />
            )}
          </View>
        </View>

        <Text className="text-2xl font-sans-bold text-foreground text-center mb-2">
          Enter verification code
        </Text>
        <Text className="text-base text-muted-foreground font-sans text-center mb-8">
          {"We've sent a 6-digit code to "}
          <Text className="font-sans-semibold text-foreground">{displayContact}</Text>
        </Text>

        {/* OTP Input */}
        <OTPInput value={otp} onChange={setOtp} className="mb-8" />

        {/* Verify button */}
        <Button
          variant="default"
          size="lg"
          onPress={handleVerify}
          loading={loading}
          className="w-full mb-4"
        >
          <Text className="text-base font-sans-semibold text-primary-foreground">
            Verify
          </Text>
        </Button>

        {/* Resend */}
        <View className="items-center gap-3">
          {countdown > 0 ? (
            <Text className="text-sm text-muted-foreground font-sans">
              Resend code in {countdown}s
            </Text>
          ) : (
            <Button variant="ghost" onPress={handleResend}>
              <Text className="text-sm font-sans-semibold text-primary">
                Resend Code
              </Text>
            </Button>
          )}

          {/* Toggle verification method */}
          {isSignUp && params.phone && (
            <Button variant="ghost" onPress={toggleMethod}>
              <View className="flex-row items-center gap-2">
                {verifyMethod === "email" ? (
                  <PhoneIcon size={16} color="#0d9488" />
                ) : (
                  <Mail size={16} color="#0d9488" />
                )}
                <Text className="text-sm font-sans-medium text-primary">
                  Verify via {verifyMethod === "email" ? "phone" : "email"} instead
                </Text>
              </View>
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
