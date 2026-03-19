import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ActionSheetIOS,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { ArrowLeft, Save, Camera } from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { usersApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/toast";
import { getInitials } from "@/lib/utils";
import { colors, palette } from "@/lib/tokens";
import { pickImage, validateImage, buildImageFormDataAsync } from "@/lib/image-utils";
import { useUploadProfileImage, useDeleteProfileImage } from "@/lib/hooks";
import { invalidateAfterProfileUpdate } from "@/lib/query";
import type { UserDto, UpdateUserRequest } from "@/lib/types";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"];

export default function EditProfileScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const { user: clerkUser } = useUser();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const uploadMutation = useUploadProfileImage();
  const deleteMutation = useDeleteProfileImage();

  const goBack = () => {
    router.canGoBack() ? router.back() : router.replace("/(tabs)/profile");
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const me = await usersApi.me(token!);
        setName(me.name ?? "");
        setPhone(me.phone ?? "");
        setCurrency(me.defaultCurrency ?? "USD");
        setProfileImageUrl(me.profileImageUrl ?? null);
      } catch {
        // use clerk defaults
        setName(clerkUser?.fullName ?? "");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^\+?[\d\s\-()]{7,20}$/.test(trimmedPhone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const data: UpdateUserRequest = {
        name: name.trim(),
        phone: trimmedPhone || undefined,
        defaultCurrency: currency,
      };
      await usersApi.updateMe(data, token!);
      toast.success("Your profile has been updated.");
      goBack();
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Something went wrong. Try again later.");
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async (source: "camera" | "gallery") => {
    const asset = await pickImage(source, { aspect: [1, 1] });
    if (!asset) return;
    const error = validateImage(asset);
    if (error) {
      toast.error(error);
      return;
    }
    setUploadingImage(true);
    try {
      const formData = await buildImageFormDataAsync(asset.uri, asset.mimeType);
      const updated = await uploadMutation.mutateAsync(formData);
      setProfileImageUrl(updated.profileImageUrl ?? null);
      toast.success("Profile photo updated.");
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Failed to upload photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    setUploadingImage(true);
    try {
      await deleteMutation.mutateAsync();
      setProfileImageUrl(null);
      toast.success("Profile photo removed.");
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Failed to remove photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    const options: string[] = [];
    if (Platform.OS !== "web") options.push("Take Photo");
    options.push("Choose from Library");
    if (profileImageUrl) options.push("Remove Photo");
    options.push("Cancel");
    const cancelIndex = options.length - 1;
    const destructiveIndex = profileImageUrl ? options.indexOf("Remove Photo") : undefined;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        (index) => {
          const selected = options[index];
          if (selected === "Take Photo") handlePickImage("camera");
          else if (selected === "Choose from Library") handlePickImage("gallery");
          else if (selected === "Remove Photo") handleRemoveImage();
        }
      );
    } else {
      // Web + Android: use gallery directly (no native ActionSheet)
      handlePickImage("gallery");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={c.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-5 py-3 gap-3">
          <Pressable
            onPress={goBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-muted active:bg-muted/80"
          >
            <ArrowLeft size={22} color={c.primary} strokeWidth={2.5} />
          </Pressable>
          <Text className="text-xl font-sans-bold text-foreground flex-1">
            Edit Profile
          </Text>
          <Pressable onPress={handleSave} disabled={saving} className="p-2">
            <Save size={22} color={saving ? palette.slate400 : c.primary} />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 gap-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <Pressable onPress={showImageOptions} disabled={uploadingImage} accessibilityRole="button" accessibilityLabel={profileImageUrl ? "Change profile photo" : "Add profile photo"} className="items-center py-4">
            <View className="relative">
              <Avatar
                src={profileImageUrl || clerkUser?.imageUrl}
                fallback={getInitials(name || "?")}
                size="lg"
              />
              {uploadingImage ? (
                <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
                  <ActivityIndicator size="small" color={palette.white} />
                </View>
              ) : (
                <View
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary items-center justify-center border-2 border-background"
                >
                  <Camera size={14} color={palette.white} />
                </View>
              )}
            </View>
            <Text className="text-sm text-primary mt-2 font-sans-medium">
              {profileImageUrl ? "Change Photo" : "Add Photo"}
            </Text>
          </Pressable>

          {/* Form */}
          <Card className="p-4 gap-4">
            <View className="gap-1">
              <Text className="text-sm font-sans-medium text-foreground">Name</Text>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-sans-medium text-foreground">Email</Text>
              <View className="bg-muted rounded-xl px-4 py-3">
                <Text className="text-sm text-muted-foreground font-sans">
                  {clerkUser?.primaryEmailAddress?.emailAddress ?? "—"}
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground font-sans">
                Email is managed by your auth provider
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-sm font-sans-medium text-foreground">Phone</Text>
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-sans-medium text-foreground">
                Default Currency
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CURRENCIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCurrency(c)}
                    className={`px-4 py-2 rounded-lg border ${
                      currency === c
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-sm font-sans-medium ${
                        currency === c ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>

          <Button onPress={handleSave} disabled={saving} className="mt-2">
            <Text className="text-base font-sans-semibold text-primary-foreground">
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
