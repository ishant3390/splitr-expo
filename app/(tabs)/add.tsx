import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
} from "react-native";
import { useColorScheme } from "nativewind";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import {
  ChevronDown,
  Plus,
  Check,
  Calendar,
  Camera,
  ImageIcon,
  X,
} from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { groupsApi, categoriesApi, expensesApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import {
  invalidateAfterGroupChange,
  invalidateAfterExpenseChange,
  invalidateAfterMemberChange,
} from "@/lib/query";
import { useToast } from "@/components/ui/toast";
import {
  getInitials,
  cn,
  centsToAmount,
  getCurrencySymbol,
  sanitizeAmountInput,
  sanitizePercentInput,
  getMemberAvatarUrl,
  parseAmountInputToCents,
} from "@/lib/utils";
import { hapticSelection, hapticSuccess, hapticError, hapticLight } from "@/lib/haptics";
import {
  allocatePercentageSplitCents,
  normalizeFixedSplitCents,
  validateExpenseInvariants,
} from "@/lib/finance-invariants";
import { colors, fontSize as fs, fontFamily as ff, palette } from "@/lib/tokens";
import { initSplitValues as computeSplitValues, dedupeMembers, inferCategoryFromDescription } from "@/lib/screen-helpers";
import { CategoryIcon } from "@/components/ui/category-icon";
import { pickImage, validateImage, buildImageFormDataAsync, compressImage } from "@/lib/image-utils";
import { useNetwork } from "@/components/NetworkProvider";
import { addToQueue, generateClientId } from "@/lib/offline";
import type { CategoryDto, GroupDto, GroupMemberDto, CreateExpenseRequest, SplitRequest } from "@/lib/types";

type SplitType = "equal" | "percentage" | "fixed";

const SMART_DEFAULTS_KEY = "@splitr/add_expense_defaults";
const CATEGORY_QUICK_IDS = ["food", "transport", "entertainment", "shopping"];
const DEFAULT_CATEGORY_PREVIEW_COUNT = 4;

export default function AddExpenseScreen() {
  const router = useRouter();
  const { isOnline, refreshPendingCount } = useNetwork();
  const params = useLocalSearchParams<{ returnGroupId?: string; quick?: string }>();
  const returnGroupId = Array.isArray(params.returnGroupId) ? params.returnGroupId[0] : params.returnGroupId;
  const isQuickMode = params.quick === "true";
  const exitDestination = returnGroupId ? `/(tabs)/groups/${returnGroupId}` : "/(tabs)";
  const goBack = () => router.replace(exitDestination as any);
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);

  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  const [description, setDescription] = useState("");
  const amountInputRef = useRef<TextInput>(null);
  const [amount, setAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedPayerMemberId, setSelectedPayerMemberId] = useState<string | null>(null);
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});
  const [splitFixedAmounts, setSplitFixedAmounts] = useState<Record<string, string>>({});
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [addParticipantName, setAddParticipantName] = useState("");
  const [addParticipantEmail, setAddParticipantEmail] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const userPickedCategoryRef = useRef(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const selectedGroupRef = useRef<GroupDto | null>(null);
  const getTokenRef = useRef(getToken);
  const clerkUserRef = useRef(clerkUser);

  // Keep refs in sync each render
  selectedGroupRef.current = selectedGroup;
  getTokenRef.current = getToken;
  clerkUserRef.current = clerkUser;

  // Load groups and categories on mount; auto-create "Personal" group if none exist
  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const [groupsData, categoriesData] = await Promise.all([
          groupsApi.list(token!),
          categoriesApi.list(token!),
        ]);
        let list = Array.isArray(groupsData) ? groupsData : [];

        // Auto-create a Personal group so expenses always have a home
        if (list.length === 0) {
          try {
            const personal = await groupsApi.create(
              { name: "Personal", description: "Quick personal expenses" },
              token!
            );
            invalidateAfterGroupChange();
            list = [personal];
          } catch {
            // If creation fails, continue — user can still create a group manually
          }
        }

        setGroups(list);

        // Load smart defaults
        let savedGroupId: string | null = null;
        let savedCategoryId: string | null = null;
        try {
          const raw = await AsyncStorage.getItem(SMART_DEFAULTS_KEY);
          if (raw) {
            const defaults = JSON.parse(raw);
            savedGroupId = defaults.groupId ?? null;
            savedCategoryId = defaults.categoryId ?? null;
          }
        } catch {}

        if (list.length > 0) {
          const preferred = returnGroupId
            ? list.find((g) => g.id === returnGroupId)
            : savedGroupId
            ? list.find((g) => g.id === savedGroupId)
            : null;
          setSelectedGroup(preferred ?? list[0]);
        }
        const cats = Array.isArray(categoriesData) ? categoriesData : [];
        setCategories(cats);
        if (cats.length > 0) {
          const savedCat = savedCategoryId ? cats.find((c) => c.id === savedCategoryId) : null;
          setSelectedCategoryId(savedCat?.id ?? cats[0].id);
        }
      } catch {
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    };
    load();
  }, []);

  // Load members when selected group changes
  useEffect(() => {
    if (!selectedGroup) return;
    let cancelled = false;
    setMembersLoading(true);
    setMembers([]);
    setSplitWith([]);
    setSelectedPayerMemberId(null);
    setShowPayerPicker(false);
    setShowAddParticipant(false);
    setAddParticipantName("");
    setAddParticipantEmail("");
    const load = async () => {
      try {
        const token = await getToken();
        const data = await groupsApi.listMembers(selectedGroup.id, token!);
        if (cancelled) return;
        const raw: GroupMemberDto[] = Array.isArray(data) ? data : [];
        const list = dedupeMembers(raw);
        setMembers(list);
        const ids = list.map((m) => m.id);
        setSplitWith(ids);
        initSplitValues(ids, splitType, amount);
        const currentEmail = clerkUser?.primaryEmailAddress?.emailAddress;
        const currentMember = list.find((m) => m.user?.email === currentEmail);
        setSelectedPayerMemberId(currentMember?.id ?? list[0]?.id ?? null);
      } catch {
        if (!cancelled) {
          setMembers([]);
          setSplitWith([]);
          setSelectedPayerMemberId(null);
        }
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedGroup?.id]);

  // Reset user-entered fields every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setDescription("");
      setAmount("");
      setExpenseDate(new Date());
      setReceiptUri(null);
      setSplitType("equal");
      setSplitPercentages({});
      setSplitFixedAmounts({});
      setShowGroupPicker(false);
      setShowPayerPicker(false);
      setShowAddParticipant(false);
      setShowAllCategories(false);
      setAddParticipantName("");
      setAddParticipantEmail("");
      userPickedCategoryRef.current = false;
    }, [])
  );

  // Refresh members on focus so newly added group members always appear
  useFocusEffect(
    useCallback(() => {
      const group = selectedGroupRef.current;
      if (!group) return;
      let cancelled = false;
      const load = async () => {
        setMembersLoading(true);
        try {
          const token = await getTokenRef.current();
          const data = await groupsApi.listMembers(group.id, token!);
          if (cancelled) return;
          const raw: GroupMemberDto[] = Array.isArray(data) ? data : [];
          const list = dedupeMembers(raw);
          setMembers(list);
          const ids = list.map((m) => m.id);
          setSplitWith(ids);
          const currentEmail = clerkUserRef.current?.primaryEmailAddress?.emailAddress;
          const currentMember = list.find((m) => m.user?.email === currentEmail);
          setSelectedPayerMemberId(currentMember?.id ?? list[0]?.id ?? null);
        } catch {
          if (!cancelled) {
            setMembers([]);
            setSplitWith([]);
          }
        } finally {
          if (!cancelled) setMembersLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [])
  );

  // Auto-select category based on description, unless user already picked one manually
  useEffect(() => {
    if (userPickedCategoryRef.current || categories.length === 0 || !description.trim()) return;
    const inferred = inferCategoryFromDescription(description, categories);
    if (inferred) setSelectedCategoryId(inferred);
  }, [description, categories]);

  const initSplitValues = (memberIds: string[], type: SplitType, totalStr: string) => {
    const values = computeSplitValues(memberIds, type, totalStr);
    if (type === "percentage") setSplitPercentages(values);
    else if (type === "fixed") setSplitFixedAmounts(values);
  };

  const handleSplitTypeChange = (type: SplitType) => {
    hapticSelection();
    setSplitType(type);
    initSplitValues(splitWith, type, amount);
  };

  const handleToggleMember = (memberId: string) => {
    hapticLight();
    setSplitWith((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      initSplitValues(next, splitType, amount);
      return next;
    });
  };

  const refreshMembersAfterParticipantChange = async (groupId: string, token: string) => {
    const updated = await groupsApi.listMembers(groupId, token);
    const deduped = dedupeMembers(Array.isArray(updated) ? updated : []);
    setMembers(deduped);
    const nextIds = deduped.map((m) => m.id);
    setSplitWith((prev) => {
      const retained = prev.filter((id) => nextIds.includes(id));
      const added = nextIds.filter((id) => !prev.includes(id));
      const merged = [...retained, ...added];
      initSplitValues(merged, splitType, amount);
      return merged;
    });
    setSelectedPayerMemberId((prev) => {
      if (prev && nextIds.includes(prev)) return prev;
      const currentEmail = clerkUser?.primaryEmailAddress?.emailAddress;
      const currentMember = deduped.find((m) => m.user?.email === currentEmail);
      return currentMember?.id ?? deduped[0]?.id ?? null;
    });
  };

  const handleAddParticipant = async () => {
    if (!selectedGroup) {
      toast.error("Please select a group.");
      return;
    }
    const name = addParticipantName.trim();
    const email = addParticipantEmail.trim().toLowerCase();
    if (!name) {
      toast.error("Please enter a name.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const currentEmail = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();
    if (email && currentEmail && email === currentEmail) {
      toast.info("You're already a member of this group.");
      return;
    }

    setAddingParticipant(true);
    try {
      const token = await getToken();
      if (email) {
        await groupsApi.inviteByEmail(selectedGroup.id, { email, name }, token!);
        toast.success(`Invite sent to ${email}`);
      } else {
        await groupsApi.addGuestMember(selectedGroup.id, { name }, token!);
        toast.success(`${name} added to group.`);
      }
      await refreshMembersAfterParticipantChange(selectedGroup.id, token!);
      invalidateAfterMemberChange(selectedGroup.id);
      hapticSuccess();
      setAddParticipantName("");
      setAddParticipantEmail("");
      setShowAddParticipant(false);
    } catch (err: unknown) {
      hapticError();
      const apiErr = parseApiError(err);
      if (apiErr) {
        if (apiErr.category === "BUSINESS_LOGIC") {
          toast.info(getUserMessage(apiErr));
        } else {
          toast.error(getUserMessage(apiErr));
        }
      } else {
        toast.error("Failed to add participant. Try again later.");
      }
    } finally {
      setAddingParticipant(false);
    }
  };

  const receiptMimeRef = useRef<string | undefined>(undefined);

  const pickReceiptImage = async (useCamera: boolean) => {
    const asset = await pickImage(useCamera ? "camera" : "gallery", { quality: 0.7 });
    if (!asset) {
      if (useCamera) toast.info("Camera unavailable. Use Gallery to pick an image.");
      return;
    }
    const error = validateImage(asset);
    if (error) { toast.error(error); return; }
    const compressed = await compressImage(asset.uri, asset.fileSize ?? undefined);
    // If compression produced a new file it's JPEG; if it fell back, preserve original MIME
    receiptMimeRef.current = compressed.uri !== asset.uri ? "image/jpeg" : (asset.mimeType ?? "image/jpeg");
    setReceiptUri(compressed.uri);
    hapticSuccess();
  };

  const handleSubmit = async () => {
    const parsedAmountCents = parseAmountInputToCents(amount);
    if (parsedAmountCents == null || parsedAmountCents <= 0) {
      hapticError();
      toast.error("Please enter a valid amount.");
      return;
    }
    if (parsedAmountCents < 1) {
      hapticError();
      toast.error("Amount must be at least 0.01.");
      return;
    }

    // Use category name as fallback description
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
    const finalDescription = description.trim() || selectedCategory?.name;
    if (!finalDescription) {
      hapticError();
      toast.error("Please enter a description or select a category.");
      return;
    }
    if (finalDescription.length > 255) {
      hapticError();
      toast.error("Description must be 255 characters or less.");
      return;
    }

    if (!selectedGroup) {
      hapticError();
      toast.error("Please select a group.");
      return;
    }
    if (!selectedPayerMemberId) {
      hapticError();
      toast.error("Please select who paid.");
      return;
    }
    if (splitWith.length === 0) {
      hapticError();
      toast.error("Please select at least one member to split with.");
      return;
    }

    // Pre-submit: validate that the payer still resolves to a known member with a backend identity.
    // selectedPayerMemberId can go stale (e.g. member reload failed or IDs changed after guest promotion).
    const payerMemberCheck = members.find((m) => m.id === selectedPayerMemberId);
    if (!payerMemberCheck) {
      hapticError();
      toast.error("Payer not found. Please re-select who paid.");
      return;
    }
    if (!payerMemberCheck.user?.id && !payerMemberCheck.guestUser?.id) {
      hapticError();
      toast.error("Payer account isn't linked yet. Please re-select who paid.");
      return;
    }

    // Pre-submit: flag any split participant that has no backend identity (neither userId nor guestUserId).
    // This catches guests who were promoted to real users but whose IDs haven't refreshed yet.
    const identitylessSplitMembers = splitWith
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is GroupMemberDto => !!m && !m.user?.id && !m.guestUser?.id);
    if (identitylessSplitMembers.length > 0) {
      hapticError();
      toast.error("Some participants need a refresh. Updating member list…");
      const refreshToken = await getToken();
      const refreshed = await groupsApi.listMembers(selectedGroup!.id, refreshToken!).catch(() => null);
      if (refreshed) {
        const list = dedupeMembers(Array.isArray(refreshed) ? refreshed : []);
        setMembers(list);
        setSplitWith(list.map((m) => m.id));
        const currentEmail = clerkUser?.primaryEmailAddress?.emailAddress;
        const current = list.find((m) => m.user?.email === currentEmail);
        setSelectedPayerMemberId(current?.id ?? list[0]?.id ?? null);
      }
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const payerMember = members.find((m) => m.id === selectedPayerMemberId);
      const totalCents = parsedAmountCents;
      const amountValue = centsToAmount(totalCents);
      const groupCurrencyCode = selectedGroup.defaultCurrency || selectedGroup.currency || "USD";
      const submitCurrencySymbol = getCurrencySymbol(groupCurrencyCode);

      // Deduplicate splits by underlying userId/guestUserId
      const seenSplitIds = new Set<string>();
      const uniqueSplitMembers = splitWith
        .map((memberId) => members.find((m) => m.id === memberId))
        .filter((member): member is GroupMemberDto => {
          if (!member) return false;
          const key = member.user?.id ?? member.guestUser?.id;
          if (!key || seenSplitIds.has(key)) return false;
          seenSplitIds.add(key);
          return true;
        });

      let splits: SplitRequest[];

      if (splitType === "percentage") {
        const totalPct = uniqueSplitMembers.reduce(
          (s, m) => s + (parseFloat(splitPercentages[m.id] ?? "0") || 0), 0
        );
        if (Math.abs(totalPct - 100) > 0.5) {
          hapticError();
          toast.error(`Percentages must add up to 100% (currently ${totalPct.toFixed(1)}%)`);
          setSubmitting(false);
          return;
        }
        const percentageValues = uniqueSplitMembers.map((member) =>
          parseFloat(splitPercentages[member.id] ?? "0")
        );
        const allocatedCents = allocatePercentageSplitCents(totalCents, percentageValues);
        if (!allocatedCents) {
          hapticError();
          toast.error("Unable to allocate split amounts. Please adjust percentages.");
          setSubmitting(false);
          return;
        }
        splits = uniqueSplitMembers.map((member, idx) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          percentage: percentageValues[idx],
          splitAmount: allocatedCents[idx],
        }));
      } else if (splitType === "fixed") {
        const rawFixedCents = uniqueSplitMembers.map((member) =>
          parseAmountInputToCents(splitFixedAmounts[member.id] ?? "0") ?? 0
        );
        const totalFixedCents = rawFixedCents.reduce((sum, value) => sum + value, 0);
        if (Math.abs(totalFixedCents - totalCents) > 1) {
          hapticError();
          toast.error(`Fixed amounts must add up to ${submitCurrencySymbol}${amountValue.toFixed(2)}`);
          setSubmitting(false);
          return;
        }
        const fixedCents = normalizeFixedSplitCents(totalCents, rawFixedCents);
        if (!fixedCents) {
          hapticError();
          toast.error("Unable to normalize fixed split amounts. Please adjust values.");
          setSubmitting(false);
          return;
        }
        splits = uniqueSplitMembers.map((member, idx) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          splitAmount: fixedCents[idx],
        }));
      } else {
        const perPersonCents = Math.floor(totalCents / uniqueSplitMembers.length);
        const remainder = totalCents - perPersonCents * uniqueSplitMembers.length;
        splits = uniqueSplitMembers.map((member, idx) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          splitAmount: idx === uniqueSplitMembers.length - 1 ? perPersonCents + remainder : perPersonCents,
        }));
      }

      const expenseInvariant = validateExpenseInvariants({
        totalAmount: totalCents,
        payers: [{ amountPaid: totalCents }],
        splits: splits.map((split) => ({ splitAmount: split.splitAmount })),
      });
      if (!expenseInvariant.ok) {
        hapticError();
        toast.error(expenseInvariant.message);
        return;
      }

      const expenseRequest: CreateExpenseRequest = {
        description: finalDescription,
        totalAmount: totalCents,
        currency: groupCurrencyCode,
        categoryId: selectedCategoryId ?? undefined,
        expenseDate: expenseDate.toISOString().split("T")[0],
        splitType: splitType === "fixed" ? "exact" : splitType,
        payers: [{ userId: payerMember?.user?.id, guestUserId: payerMember?.guestUser?.id, amountPaid: totalCents }],
        splits,
      };

      if (isOnline) {
        const createdExpense = await groupsApi.createExpense(selectedGroup.id, expenseRequest, token!);
        invalidateAfterExpenseChange(selectedGroup.id);
        hapticSuccess();

        // Upload receipt in background (non-blocking — expense already saved)
        if (receiptUri && createdExpense?.id) {
          const expId = createdExpense.id;
          const grpId = selectedGroup.id;
          const uri = receiptUri;
          const mime = receiptMimeRef.current;
          buildImageFormDataAsync(uri, mime).then((formData) =>
            expensesApi.uploadReceipt(expId, formData, token!).then(
              () => invalidateAfterExpenseChange(grpId),
              () => toast.info("Expense saved but receipt upload failed. Attach it later from edit.")
            )
          ).catch(() => {});
        }

        // Save smart defaults for next time
        AsyncStorage.setItem(SMART_DEFAULTS_KEY, JSON.stringify({
          groupId: selectedGroup.id,
          categoryId: selectedCategoryId,
        })).catch(() => {});
        // Show success animation briefly then navigate back
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          router.replace(exitDestination as any);
        }, 800);
        return;
      } else {
        // Offline: queue for later sync
        await addToQueue({
          clientId: generateClientId(),
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          request: expenseRequest,
          description: finalDescription,
          amountCents: totalCents,
          queuedAt: new Date().toISOString(),
          attempts: 0,
        });
        await refreshPendingCount();
        hapticSuccess();
        toast.info(`"${finalDescription}" saved. It will sync when you're back online.`);
      }
      router.replace(exitDestination as any);
    } catch (err: unknown) {
      hapticError();
      const apiErr = parseApiError(err);
      if (apiErr?.code === "ERR-420" && selectedGroup) {
        // Participant IDs went stale (e.g. guest-to-user promotion). Refresh the member list
        // so the user can immediately retry with up-to-date data.
        toast.error("Participant details changed. Member list refreshed — please try again.");
        try {
          const refreshToken = await getToken();
          const refreshed = await groupsApi.listMembers(selectedGroup.id, refreshToken!);
          const list = dedupeMembers(Array.isArray(refreshed) ? refreshed : []);
          setMembers(list);
          setSplitWith(list.map((m) => m.id));
          const currentEmail = clerkUser?.primaryEmailAddress?.emailAddress;
          const current = list.find((m) => m.user?.email === currentEmail);
          setSelectedPayerMemberId(current?.id ?? list[0]?.id ?? null);
        } catch {
          // silently ignore refresh failure — user can manually retry
        }
      } else {
        toast.error(apiErr ? getUserMessage(apiErr) : "Something went wrong. Try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const groupCurrencyCode = selectedGroup?.defaultCurrency ?? selectedGroup?.currency ?? "USD";
  const perPerson =
    splitWith.length > 0
      ? (centsToAmount(parseAmountInputToCents(amount) ?? 0) / splitWith.length).toFixed(2)
      : "0.00";
  const totalPct = splitWith.reduce((s, id) => s + (parseFloat(splitPercentages[id] ?? "0") || 0), 0);
  const totalAmountCents = parseAmountInputToCents(amount) ?? 0;
  const totalFixedCents = splitWith.reduce(
    (sum, id) => sum + (parseAmountInputToCents(splitFixedAmounts[id] ?? "0") ?? 0),
    0
  );
  const totalFixed = centsToAmount(totalFixedCents);
  const currencySymbol = getCurrencySymbol(groupCurrencyCode);
  const categoryOrder = useMemo(() => {
    const lookup = new Map(
      categories.map((cat, index) => [cat.id.toLowerCase(), index] as const)
    );
    const preferredIndices = CATEGORY_QUICK_IDS
      .map((id) => lookup.get(id))
      .filter((index): index is number => typeof index === "number");
    const preferred = preferredIndices.map((index) => categories[index]);
    const preferredSet = new Set(preferred.map((cat) => cat.id));
    const rest = categories.filter((cat) => !preferredSet.has(cat.id));
    return [...preferred, ...rest];
  }, [categories]);
  const previewCategories = useMemo(() => {
    const base = categoryOrder.slice(0, DEFAULT_CATEGORY_PREVIEW_COUNT);
    if (!selectedCategoryId || base.some((cat) => cat.id === selectedCategoryId)) return base;
    const selected = categoryOrder.find((cat) => cat.id === selectedCategoryId);
    if (!selected) return base;
    if (base.length < DEFAULT_CATEGORY_PREVIEW_COUNT) return [...base, selected];
    return [...base.slice(0, DEFAULT_CATEGORY_PREVIEW_COUNT - 1), selected];
  }, [categoryOrder, selectedCategoryId]);
  const fullCategories = categoryOrder;
  const hasExtraCategories = fullCategories.length > DEFAULT_CATEGORY_PREVIEW_COUNT;

  if (groupsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-5 pt-6">
          <SkeletonList count={4} type="activity" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} className="border-b border-border">
          <View className="flex-row items-center justify-between px-5 py-3">
            <Pressable onPress={goBack} hitSlop={12} style={{ width: 72 }}>
              <Text className="text-base font-sans-medium text-muted-foreground">Cancel</Text>
            </Pressable>
            <View className="flex-1 items-center px-2">
              <Text className="text-lg font-sans-semibold text-foreground">{isQuickMode ? "Quick Add" : "Add Expense"}</Text>
              {selectedGroup && (
                <Text
                  testID="header-group-context"
                  className="text-xs font-sans text-muted-foreground mt-0.5"
                  numberOfLines={1}
                >
                  {selectedGroup.name}
                </Text>
              )}
            </View>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || membersLoading}
              hitSlop={12}
              style={{ width: 72, alignItems: "flex-end" }}
            >
              <Text className="text-base font-sans-semibold text-primary">
                {submitting ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-6 pb-32 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Amount — hero section */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <View className="items-center py-6 mx-[-20] px-5 bg-primary/[0.03] dark:bg-primary/[0.08] rounded-3xl">
              <Pressable
                onPress={() => amountInputRef.current?.focus()}
                style={{ width: "100%", alignItems: "center" }}
              >
                {(() => {
                  // Lock at dotIdx+3 once 2 decimals are typed — prevents 3rd-decimal flicker
                  const amountMaxLength = amount.includes(".")
                    ? amount.indexOf(".") + 3
                    : 15;
                  // Shrink font as the number grows so it never runs off-screen
                  const amountFontSize =
                    amount.length <= 7 ? 48
                    : amount.length <= 9 ? 40
                    : amount.length <= 11 ? 32
                    : 26;
                  return (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", maxWidth: "100%" }}>
                  <Text
                    testID="amount-currency-symbol"
                    style={{
                      fontSize: amountFontSize,
                      fontWeight: "700",
                      fontVariant: ["tabular-nums"],
                      color: c.foreground,
                    }}
                  >
                    {currencySymbol}
                  </Text>
                  <TextInput
                    ref={amountInputRef}
                    value={amount}
                    onChangeText={(val) => {
                      const sanitized = sanitizeAmountInput(val);
                      if (sanitized !== amount) setAmount(sanitized);
                    }}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    placeholder="0"
                    testID="amount-input"
                    maxLength={amountMaxLength}
                    placeholderTextColor={c.placeholder}
                    className="text-foreground"
                    inputAccessoryViewID="amount-done"
                    style={{
                      fontSize: amountFontSize,
                      fontWeight: "700",
                      padding: 0,
                      fontVariant: ["tabular-nums"],
                      minWidth: 72,
                      borderWidth: 0,
                      outlineWidth: 0,
                      outlineColor: "transparent",
                      backgroundColor: "transparent",
                      textAlign: "center",
                      flexGrow: 0,
                      flexShrink: 1,
                    }}
                  />
                </View>
                  );
                })()}
              </Pressable>
            </View>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Input
            label="Description"
            placeholder="What was this for?"
            value={description}
            onChangeText={setDescription}
            maxLength={255}
          />
          {/* Receipt photo */}
          {!isQuickMode && receiptUri ? (
            <View className="mt-3">
              <View className="relative rounded-xl overflow-hidden" style={{ height: 120 }}>
                <Image source={{ uri: receiptUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                <Pressable
                  testID="remove-receipt"
                  onPress={() => setReceiptUri(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 items-center justify-center"
                >
                  <X size={14} color={palette.white} />
                </Pressable>
              </View>
            </View>
          ) : !isQuickMode ? (
            <View className="flex-row gap-2 mt-3">
              <Pressable
                  onPress={() => pickReceiptImage(true)}
                  className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-muted"
                >
                  <Camera size={14} color={c.mutedForeground} />
                  <Text className="text-xs font-sans-medium text-muted-foreground">Photo</Text>
                </Pressable>
              <Pressable
                onPress={() => pickReceiptImage(false)}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-muted"
              >
                <ImageIcon size={14} color={c.mutedForeground} />
                <Text className="text-xs font-sans-medium text-muted-foreground">Gallery</Text>
              </Pressable>
            </View>
          ) : null}
          </Animated.View>

          {/* Date */}
          {!isQuickMode && <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Date</Text>
            <Pressable
              onPress={() => {
                if (Platform.OS === 'web') {
                  dateInputRef.current?.showPicker();
                } else {
                  setShowDatePicker(true);
                }
              }}
              className="flex-row items-center gap-3 bg-muted rounded-xl px-4 py-3.5"
            >
              <Calendar size={18} color={c.mutedForeground} />
              <Text className="text-base font-sans text-foreground flex-1">
                {expenseDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </Text>
              {expenseDate.toDateString() === new Date().toDateString() && (
                <Text className="text-xs font-sans-medium text-primary">Today</Text>
              )}
            </Pressable>
            {Platform.OS === 'web' && (
              <input
                ref={dateInputRef}
                type="date"
                value={expenseDate.toISOString().split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    setExpenseDate(new Date(e.target.value + 'T00:00:00'));
                  }
                }}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
            )}
            {Platform.OS !== 'web' && showDatePicker && (
              <DateTimePicker
                value={expenseDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={(event, date) => {
                  // Android always dismisses on set/dismiss; iOS spinner stays open until dismissed
                  if (Platform.OS === "android") {
                    setShowDatePicker(false);
                  }
                  if (date && event.type !== "dismissed") setExpenseDate(date);
                }}
              />
            )}
            {Platform.OS === "ios" && showDatePicker && (
              <View className="flex-row justify-end mt-2">
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  className="px-4 py-2"
                >
                  <Text className="text-sm font-sans-semibold text-primary">Done</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>}

          {/* Category */}
          {!isQuickMode && <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Category</Text>
            {categories.length === 0 ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 pr-1"
                  className="max-h-14"
                >
                  {previewCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => { hapticSelection(); userPickedCategoryRef.current = true; setSelectedCategoryId(cat.id); }}
                        className={cn(
                          "h-11 min-w-[116px] px-3 rounded-xl border flex-row items-center gap-2",
                          isSelected ? "bg-primary border-primary" : "bg-card border-border"
                        )}
                      >
                        <CategoryIcon iconName={cat.icon} size="sm" />
                        <Text
                          className={cn(
                            "text-sm font-sans-medium",
                            isSelected ? "text-primary-foreground" : "text-foreground"
                          )}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {hasExtraCategories && (
                  <Pressable
                    testID="category-toggle"
                    onPress={() => setShowAllCategories((prev) => !prev)}
                    className="self-start mt-2 px-2.5 py-1 rounded-full bg-muted"
                  >
                    <Text className="text-xs font-sans-medium text-muted-foreground">
                      {showAllCategories ? "Show less" : `Show all (${fullCategories.length})`}
                    </Text>
                  </Pressable>
                )}
                {showAllCategories && (
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {fullCategories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <Pressable
                          key={`all-${cat.id}`}
                          onPress={() => { hapticSelection(); userPickedCategoryRef.current = true; setSelectedCategoryId(cat.id); }}
                          className={cn(
                            "flex-row items-center gap-2 px-3 py-2 rounded-xl border",
                            isSelected ? "bg-primary border-primary" : "bg-card border-border"
                          )}
                        >
                          <CategoryIcon iconName={cat.icon} size="sm" />
                          <Text
                            className={cn(
                              "text-sm font-sans-medium",
                              isSelected ? "text-primary-foreground" : "text-foreground"
                            )}
                          >
                            {cat.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </Animated.View>}

          {/* Group + Paid by summary for quicker scan */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-sans-medium text-foreground mb-2">Group</Text>
                <Pressable
                  testID="group-summary-card"
                  onPress={() => {
                    setShowPayerPicker(false);
                    setShowGroupPicker((prev) => !prev);
                  }}
                >
                  <Card className="p-3.5 flex-row items-center justify-between" style={{ minHeight: 62 }}>
                    <Text
                      testID="group-summary-name"
                      className="font-sans-medium text-card-foreground flex-1"
                      numberOfLines={1}
                    >
                      {selectedGroup?.name ?? "Select a group"}
                    </Text>
                    <ChevronDown size={20} color={c.mutedForeground} />
                  </Card>
                </Pressable>
                {showGroupPicker && (
                  <Card className="mt-2 p-2 gap-1">
                    {groups.map((group) => (
                      <Pressable
                        key={group.id}
                        onPress={() => {
                          setSelectedGroup(group);
                          setShowGroupPicker(false);
                        }}
                        className={cn(
                          "px-3 py-2.5 rounded-lg",
                          group.id === selectedGroup?.id ? "bg-primary" : "bg-transparent"
                        )}
                      >
                        <Text
                          className={cn(
                            "font-sans-medium",
                            group.id === selectedGroup?.id
                              ? "text-primary-foreground"
                              : "text-card-foreground"
                          )}
                        >
                          {group.name}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => {
                        setShowGroupPicker(false);
                        router.push("/create-group");
                      }}
                      className="flex-row items-center gap-2 px-3 py-2.5 rounded-lg"
                    >
                      <Plus size={16} color={c.accent} />
                      <Text className="font-sans-medium text-accent">Create New Group</Text>
                    </Pressable>
                  </Card>
                )}
              </View>

              {!isQuickMode && selectedGroup && !membersLoading && members.length > 0 && (
                <View className="flex-1">
                  <Text className="text-sm font-sans-medium text-foreground mb-2">Paid by</Text>
                  <Pressable
                    testID="payer-summary-card"
                    onPress={() => {
                      setShowGroupPicker(false);
                      setShowPayerPicker((prev) => !prev);
                    }}
                  >
                    <Card className="p-3.5 flex-row items-center justify-between gap-2" style={{ minHeight: 62 }}>
                      {(() => {
                        const payer = members.find((m) => m.id === selectedPayerMemberId);
                        const payerName =
                          payer?.user?.name || payer?.guestUser?.name || payer?.displayName || "Select payer";
                        return (
                          <>
                            <View className="flex-row items-center gap-2 flex-1">
                              <Avatar
                                src={getMemberAvatarUrl(payer?.user)}
                                fallback={getInitials(payerName)}
                                size="sm"
                              />
                              <Text
                                testID="payer-summary-name"
                                className="font-sans-medium text-card-foreground flex-1"
                                numberOfLines={1}
                              >
                                {payerName}
                              </Text>
                            </View>
                            <ChevronDown size={20} color={c.mutedForeground} />
                          </>
                        );
                      })()}
                    </Card>
                  </Pressable>
                  {showPayerPicker && (
                    <Card className="mt-2 p-2 gap-1">
                      {members.map((member) => {
                        const isSelected = selectedPayerMemberId === member.id;
                        const memberName =
                          member.user?.name || member.guestUser?.name || member.displayName || "Member";
                        return (
                          <Pressable
                            key={member.id}
                            testID={`payer-option-${member.id}`}
                            onPress={() => {
                              setSelectedPayerMemberId(member.id);
                              setShowPayerPicker(false);
                            }}
                            className={cn(
                              "px-3 py-2.5 rounded-lg flex-row items-center gap-2",
                              isSelected ? "bg-primary" : "bg-transparent"
                            )}
                          >
                            <Avatar
                              src={getMemberAvatarUrl(member.user)}
                              fallback={getInitials(memberName)}
                              size="sm"
                            />
                            <Text
                              className={cn(
                                "font-sans-medium flex-1",
                                isSelected ? "text-primary-foreground" : "text-card-foreground"
                              )}
                            >
                              {memberName}
                            </Text>
                            {isSelected && <Check size={16} color={palette.white} />}
                          </Pressable>
                        );
                      })}
                    </Card>
                  )}
                </View>
              )}
            </View>
          </Animated.View>

          {/* Quick mode submit button */}
          {isQuickMode && (
            <Animated.View entering={FadeInDown.delay(200).duration(300)}>
              <Button
                variant="default"
                onPress={handleSubmit}
                disabled={submitting || membersLoading || !amount || !description.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={palette.white} />
                ) : (
                  <Text className="text-base font-sans-semibold text-primary-foreground">
                    Quick Save
                  </Text>
                )}
              </Button>
              <Text className="text-xs text-muted-foreground font-sans text-center mt-2">
                Equal split among all members
              </Text>
            </Animated.View>
          )}

          {/* Split with */}
          {!isQuickMode && selectedGroup && (
            <View>
              {/* Header row */}
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-sans-medium text-foreground">
                  Split with ({splitWith.length})
                </Text>
                {splitType === "equal" && (
                  <Text className="text-sm text-primary font-sans-semibold">
                    {`${currencySymbol}${perPerson}/person`}
                  </Text>
                )}
                {splitType === "percentage" && (
                  <Text className={cn(
                    "text-sm font-sans-semibold",
                    Math.abs(totalPct - 100) < 0.5 ? "text-primary" : "text-destructive"
                  )}>
                    {totalPct.toFixed(1)}% / 100%
                  </Text>
                )}
                {splitType === "fixed" && (
                  <Text className={cn(
                    "text-sm font-sans-semibold",
                    Math.abs(totalFixedCents - totalAmountCents) <= 1 ? "text-primary" : "text-destructive"
                  )}>
                    {`${currencySymbol}${totalFixed.toFixed(2)} / ${currencySymbol}${centsToAmount(totalAmountCents).toFixed(2)}`}
                  </Text>
                )}
              </View>
              {/* Inline validation hint */}
              {splitType === "percentage" && splitWith.length > 0 && Math.abs(totalPct - 100) >= 0.5 && (
                <Text className="text-xs text-destructive font-sans mb-1">
                  {totalPct < 100 ? `${(100 - totalPct).toFixed(1)}% remaining` : `${(totalPct - 100).toFixed(1)}% over — reduce to 100%`}
                </Text>
              )}
              {splitType === "fixed" && splitWith.length > 0 && Math.abs(totalFixedCents - totalAmountCents) > 1 && (
                <Text className="text-xs text-destructive font-sans mb-1">
                  {totalFixedCents < totalAmountCents
                    ? `${currencySymbol}${centsToAmount(totalAmountCents - totalFixedCents).toFixed(2)} remaining`
                    : `${currencySymbol}${centsToAmount(totalFixedCents - totalAmountCents).toFixed(2)} over — reduce to match total`}
                </Text>
              )}

              {/* Split type selector */}
              <View className="flex-row gap-2 mb-3">
                {(["equal", "percentage", "fixed"] as SplitType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => handleSplitTypeChange(type)}
                    className={cn(
                      "flex-1 py-2 rounded-lg border items-center",
                      splitType === type ? "bg-primary border-primary" : "bg-card border-border"
                    )}
                  >
                    <Text className={cn(
                      "text-xs font-sans-semibold",
                      splitType === type ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {type === "equal" ? "Equal" : type === "percentage" ? "Percentage" : "Fixed"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                testID="add-participant-toggle"
                onPress={() => setShowAddParticipant((prev) => !prev)}
                className="mb-3"
              >
                <Card className="p-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Plus size={16} color={c.primary} />
                    <Text className="text-sm font-sans-medium text-card-foreground">Add participant</Text>
                  </View>
                  <ChevronDown size={16} color={c.mutedForeground} />
                </Card>
              </Pressable>

              {showAddParticipant && (
                <Card className="p-3 mb-3 gap-2" testID="add-participant-form">
                  <Input
                    label="Name"
                    placeholder="e.g., Alex"
                    value={addParticipantName}
                    onChangeText={setAddParticipantName}
                    autoCapitalize="words"
                    maxLength={80}
                  />
                  <Input
                    label="Email (optional)"
                    placeholder="e.g., alex@example.com"
                    value={addParticipantEmail}
                    onChangeText={setAddParticipantEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    maxLength={120}
                  />
                  <Button
                    onPress={handleAddParticipant}
                    disabled={addingParticipant || !addParticipantName.trim()}
                  >
                    {addingParticipant ? "Adding..." : "Add to group"}
                  </Button>
                </Card>
              )}

              {membersLoading ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <View className="gap-2">
                  {members.map((member) => {
                    const isChecked = splitWith.includes(member.id);
                    const memberName = member.user?.name || member.guestUser?.name || member.displayName || "Member";
                    return (
                      <Pressable
                        key={member.id}
                        onPress={() => handleToggleMember(member.id)}
                      >
                        <Card
                          className={cn(
                            "p-3 flex-row items-center gap-3",
                            isChecked && "border-primary/30 bg-primary/5"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleMember(member.id)}
                          />
                          <Avatar
                            src={getMemberAvatarUrl(member.user)}
                            fallback={getInitials(memberName)}
                            size="sm"
                          />
                          <Text className="flex-1 text-sm font-sans-medium text-card-foreground">
                            {memberName}
                          </Text>
                          {isChecked && splitType === "equal" && !!amount && (
                            <Text className="text-sm font-sans-semibold text-primary">
                              {`${currencySymbol}${perPerson}`}
                            </Text>
                          )}
                          {isChecked && splitType === "percentage" && (
                            <Pressable onPress={(e) => e.stopPropagation()}>
                              <View className="flex-row items-center border border-border rounded-lg bg-muted overflow-hidden">
                                <TextInput
                                  value={splitPercentages[member.id] ?? ""}
                                  onChangeText={(val) =>
                                    setSplitPercentages((prev) => ({ ...prev, [member.id]: sanitizePercentInput(val) }))
                                  }
                                  keyboardType="decimal-pad"
                                  inputMode="decimal"
                                  inputAccessoryViewID="amount-done"
                                  placeholder="0"
                                  placeholderTextColor={c.placeholder}
                                  style={{ width: 44, paddingHorizontal: 8, paddingVertical: 6, fontSize: fs.base, textAlign: "right", fontFamily: ff.regular }}
                                  className="text-foreground"
                                />
                                <Text className="text-sm text-muted-foreground font-sans pr-2">%</Text>
                              </View>
                            </Pressable>
                          )}
                          {isChecked && splitType === "fixed" && (
                            <Pressable onPress={(e) => e.stopPropagation()}>
                              <View className="flex-row items-center border border-border rounded-lg bg-muted overflow-hidden">
                                <Text className="text-sm text-muted-foreground font-sans pl-2">{currencySymbol}</Text>
                                <TextInput
                                  value={splitFixedAmounts[member.id] ?? ""}
                                  onChangeText={(val) =>
                                    setSplitFixedAmounts((prev) => ({ ...prev, [member.id]: sanitizeAmountInput(val) }))
                                  }
                                  keyboardType="decimal-pad"
                                  inputMode="decimal"
                                  inputAccessoryViewID="amount-done"
                                  placeholder="0.00"
                                  placeholderTextColor={c.placeholder}
                                  style={{ width: 56, paddingHorizontal: 8, paddingVertical: 6, fontSize: fs.base, textAlign: "right", fontFamily: ff.regular }}
                                  className="text-foreground"
                                />
                              </View>
                            </Pressable>
                          )}
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Keyboard done button for decimal pad */}
      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID="amount-done">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              backgroundColor: c.muted,
              borderTopWidth: 1,
              borderTopColor: c.border,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Pressable onPress={() => Keyboard.dismiss()}>
              <Text style={{ fontSize: fs.lg, fontFamily: ff.semibold, color: c.primary }}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(13, 148, 136, 0.95)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View entering={FadeInDown.duration(300)}>
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mb-4">
              <Check size={40} color={palette.white} />
            </View>
            <Text className="text-lg font-sans-bold text-white text-center">Expense Added!</Text>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
