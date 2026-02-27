import React, { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react-native";

export default function SignUpFormScreen() {
  const router = useRouter();
  const toast = useToast();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(auth)"));
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

    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;

    if (!hasEmail && !hasPhone) {
      newErrors.contact = "Please provide at least an email address or phone number";
    } else {
      if (hasEmail && !/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = "Enter a valid email address";
      }
      if (hasPhone && phone.replace(/\D/g, "").length < 10) {
        newErrors.phone = "Enter a valid phone number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      if (email.trim()) payload.emailAddress = email.trim();
      if (phone.trim()) payload.phoneNumber = phone.trim();

      await signUp?.create(payload);

      // Prefer email verification, fall back to phone
      if (email.trim()) {
        await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
        router.push({
          pathname: "/(auth)/otp-verify",
          params: { contact: email.trim(), phone: phone.trim(), mode: "signup", method: "email" },
        });
      } else {
        await signUp?.preparePhoneNumberVerification({ strategy: "phone_code" });
        router.push({
          pathname: "/(auth)/otp-verify",
          params: { contact: phone.trim(), phone: phone.trim(), mode: "signup", method: "phone" },
        });
      }
    } catch (err: any) {
      toast.error("Something went wrong. Try again later.");
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
          <Button variant="ghost" size="icon" onPress={goBack}>
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
              label="Email Address"
              placeholder="john@example.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.contact || errors.email)
                  setErrors((e) => ({ ...e, contact: "", email: "" }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />

            <Input
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (errors.contact || errors.phone)
                  setErrors((e) => ({ ...e, contact: "", phone: "" }));
              }}
              keyboardType="phone-pad"
              autoComplete="tel"
              error={errors.phone}
            />

            {errors.contact ? (
              <Text className="text-xs text-destructive font-sans -mt-2">
                {errors.contact}
              </Text>
            ) : (
              <Text className="text-xs text-muted-foreground font-sans -mt-2">
                Provide at least one: email or phone number
              </Text>
            )}

            <View className="bg-primary/5 rounded-xl p-4 mt-2">
              <Text className="text-sm text-foreground font-sans-medium mb-1">
                What happens next?
              </Text>
              <Text className="text-xs text-muted-foreground font-sans leading-5">
                {"We'll send a 6-digit verification code to confirm your account."}
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
