import React, { useState } from "react";
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Mail, Phone } from "lucide-react-native";

export default function SignUpFormScreen() {
  const router = useRouter();
  const { signUp, setActive } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Enter a valid email";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    else if (phone.replace(/\D/g, "").length < 10) newErrors.phone = "Enter a valid phone number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await signUp?.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        phoneNumber: phone.trim(),
      });

      // Request email verification by default
      await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });

      router.push({
        pathname: "/(auth)/otp-verify",
        params: {
          contact: email.trim(),
          phone: phone.trim(),
          mode: "signup",
        },
      });
    } catch (err: any) {
      Alert.alert(
        "Sign Up Error",
        err?.errors?.[0]?.longMessage || err?.message || "Could not create account"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={24} color="#0f172a" />
          </Button>
          <Text className="flex-1 text-lg font-sans-semibold text-foreground text-center mr-10">
            Create Account
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress indicator */}
          <View className="flex-row items-center gap-2 mb-8 mt-4">
            <View className="flex-1 h-1 rounded-full bg-primary" />
            <View className="flex-1 h-1 rounded-full bg-border" />
          </View>

          <Text className="text-2xl font-sans-bold text-foreground mb-2">
            Your details
          </Text>
          <Text className="text-base text-muted-foreground font-sans mb-8">
            We need a few details to set up your Splitr account.
          </Text>

          {/* Form fields */}
          <View className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="First Name *"
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  error={errors.firstName}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Last Name *"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  error={errors.lastName}
                />
              </View>
            </View>

            <Input
              label="Email Address *"
              placeholder="john@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />

            <Input
              label="Phone Number *"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              error={errors.phone}
            />

            <View className="bg-primary/5 rounded-xl p-4 mt-2">
              <Text className="text-sm text-foreground font-sans-medium mb-1">
                What happens next?
              </Text>
              <Text className="text-xs text-muted-foreground font-sans leading-5">
                {"We'll send a 6-digit verification code to your email to confirm your account. You can also verify via phone."}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit button */}
        <View className="px-6 pb-4 pt-2 border-t border-border bg-background">
          <Button
            variant="default"
            size="lg"
            onPress={handleSubmit}
            loading={loading}
            className="w-full"
          >
            <Text className="text-base font-sans-semibold text-primary-foreground">
              Continue
            </Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
