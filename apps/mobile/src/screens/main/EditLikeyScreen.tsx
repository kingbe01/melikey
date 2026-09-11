import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import {
  api,
  SERVICE_SUBCATEGORIES,
  type BusinessCategory,
  type Likey,
  type LikeyTier,
  type ServiceSubcategory,
} from "../../lib/api";
import { subjectName } from "../../lib/likeySubject";
import { TIER_LABELS } from "../../lib/likeyTiers";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { colors } from "../../theme/colors";

const COMMENT_MAX = 200;

const PLACE_CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "entertainment", label: "Entertainment" },
  { value: "general", label: "General" },
];

export default function EditLikeyScreen({
  item,
  onDone,
  onCancel,
}: {
  item: Likey;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();

  // A manually-entered place (no externalPlaceId) isn't shared with anyone
  // else's posts, so its name/city/state are safe to correct here too — an
  // Apple-Maps-sourced place could belong to many other people's Likeys, so
  // only its category (a coarse, often-wrong guess) is editable there. Media
  // items have no edit endpoint yet — every submission is its own row
  // anyway (no dedup), so this only ever hides fields, never blocks a
  // shared entity from being changed by someone else's edit.
  const canEditFullPlace = !!item.business && !item.business.externalPlaceId;
  const [draftBusinessName, setDraftBusinessName] = useState(item.business?.name ?? "");
  const [draftBusinessCategory, setDraftBusinessCategory] = useState<BusinessCategory | null>(
    item.business?.category ?? null
  );
  const [draftBusinessSubcategory, setDraftBusinessSubcategory] = useState<ServiceSubcategory | null>(
    item.business?.subcategory ?? null
  );
  const [draftBusinessCity, setDraftBusinessCity] = useState(item.business?.city ?? "");
  const [draftBusinessState, setDraftBusinessState] = useState(item.business?.state ?? "");
  const [draftBusinessPhone, setDraftBusinessPhone] = useState(item.business?.phone ?? "");
  const [draftBusinessEmail, setDraftBusinessEmail] = useState(item.business?.email ?? "");

  const [draftTier, setDraftTier] = useState<LikeyTier>(item.tier);
  const [draftComment, setDraftComment] = useState(item.comment ?? "");
  const [draftPhotoUrl, setDraftPhotoUrl] = useState<string | null>(item.photoUrl);
  const [draftPhotoBase64, setDraftPhotoBase64] = useState<string | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const { pickPhoto: openPhotoPicker, modal: photoPickerModal } = usePhotoPicker();

  const pickPhoto = async () => {
    const base64 = await openPhotoPicker();
    if (base64) {
      setDraftPhotoBase64(base64);
      setDraftPhotoUrl(`data:image/jpeg;base64,${base64}`);
    }
  };

  const removePhoto = () => {
    setDraftPhotoBase64(null);
    setDraftPhotoUrl(null);
  };

  const canSave =
    !isSaving &&
    !(canEditFullPlace && !draftBusinessName.trim()) &&
    !(item.business && !draftBusinessCategory) &&
    !(draftBusinessCategory === "general" && !draftBusinessSubcategory);

  const onSave = async () => {
    if (!token || !canSave) return;
    setIsSaving(true);
    try {
      if (item.business && draftBusinessCategory) {
        await api.updateBusiness(token, item.business.id, {
          category: draftBusinessCategory,
          subcategory: draftBusinessCategory === "general" ? (draftBusinessSubcategory ?? undefined) : undefined,
          ...(canEditFullPlace
            ? {
                name: draftBusinessName.trim(),
                city: draftBusinessCity.trim() || undefined,
                state: draftBusinessState.trim() || undefined,
                phone: draftBusinessPhone.trim() || null,
                email: draftBusinessEmail.trim() || null,
              }
            : {}),
        });
      }
      await api.updateLikey(token, item.id, {
        tier: draftTier,
        comment: draftComment.trim() || null,
        ...(draftPhotoBase64 !== undefined ? { photoBase64: draftPhotoBase64 } : {}),
      });
      onDone();
    } catch (e) {
      Alert.alert("Couldn't save changes", e instanceof Error ? e.message : "Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={onCancel}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
      >
        {item.business ? (
          <>
            {canEditFullPlace ? (
              <>
                <Text style={styles.section}>Place name</Text>
                <TextInput style={styles.input} value={draftBusinessName} onChangeText={setDraftBusinessName} />
              </>
            ) : (
              <Text style={styles.hint}>{draftBusinessName} — category can be corrected, other details are shared</Text>
            )}
            <Text style={styles.section}>Category</Text>
            <View style={styles.chipRow}>
              {(canEditFullPlace ? PLACE_CATEGORIES : PLACE_CATEGORIES.filter((c) => c.value !== "general")).map(
                (c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.chip, draftBusinessCategory === c.value && styles.chipSelected]}
                    onPress={() => setDraftBusinessCategory(c.value)}
                  >
                    <Text style={draftBusinessCategory === c.value && styles.chipTextSelected}>{c.label}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            {canEditFullPlace && draftBusinessCategory === "general" ? (
              <>
                <View style={styles.chipRow}>
                  {SERVICE_SUBCATEGORIES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, draftBusinessSubcategory === s && styles.chipSelected]}
                      onPress={() => setDraftBusinessSubcategory(s)}
                    >
                      <Text style={draftBusinessSubcategory === s && styles.chipTextSelected}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {!draftBusinessSubcategory ? (
                  <Text style={styles.fieldError}>Pick a kind of service to save</Text>
                ) : null}
              </>
            ) : null}
            {canEditFullPlace ? (
              <>
                <View style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, styles.cityInput]}
                    placeholder="City"
                    value={draftBusinessCity}
                    onChangeText={setDraftBusinessCity}
                  />
                  <TextInput
                    style={[styles.input, styles.stateInput]}
                    placeholder="State"
                    autoCapitalize="characters"
                    maxLength={2}
                    value={draftBusinessState}
                    onChangeText={setDraftBusinessState}
                  />
                </View>
                <Text style={styles.section}>Contact info (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  value={draftBusinessPhone}
                  onChangeText={setDraftBusinessPhone}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={draftBusinessEmail}
                  onChangeText={setDraftBusinessEmail}
                />
              </>
            ) : null}
          </>
        ) : (
          <Text style={styles.hint}>{subjectName(item)} — details aren't editable here</Text>
        )}

        <Text style={styles.section}>Your rating</Text>
        <View style={styles.chipRow}>
          {(["LIKED", "FINE", "DISLIKED"] as LikeyTier[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, draftTier === t && styles.chipSelected]}
              onPress={() => setDraftTier(t)}
            >
              <Text style={draftTier === t && styles.chipTextSelected}>{TIER_LABELS[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Add a note (optional)</Text>
        <TextInput
          style={[styles.input, styles.commentInput]}
          placeholder="What stood out?"
          multiline
          maxLength={COMMENT_MAX}
          value={draftComment}
          onChangeText={setDraftComment}
        />
        <Text style={styles.muted}>
          {draftComment.length}/{COMMENT_MAX}
        </Text>

        <Text style={styles.section}>Photo</Text>
        {draftPhotoUrl ? (
          <View>
            <Image source={{ uri: draftPhotoUrl }} style={styles.photoPreview} />
            <Button label="Remove photo" variant="dangerOutline" small style={styles.linkButton} onPress={removePhoto} />
          </View>
        ) : (
          <Button label="Add a photo" variant="secondary" small style={styles.linkButton} onPress={pickPhoto} />
        )}

        <View style={styles.actionRow}>
          <Button label="Cancel" variant="secondary" disabled={isSaving} onPress={onCancel} style={styles.actionButton} />
          <Button
            label={isSaving ? "Saving..." : "Save"}
            loading={isSaving}
            disabled={!canSave}
            onPress={onSave}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </View>
    {photoPickerModal}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backRow: { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 0, gap: 8, paddingBottom: 48 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16, color: colors.text },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  fieldError: { color: colors.danger, fontSize: 13, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  commentInput: { minHeight: 80, textAlignVertical: "top" },
  optionRow: { flexDirection: "row", gap: 8 },
  cityInput: { flex: 2 },
  stateInput: { flex: 1 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipTextSelected: { color: colors.primaryDark, fontWeight: "600" },
  photoPreview: { width: 120, height: 120, borderRadius: 10, marginBottom: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 24 },
  actionButton: { flex: 1 },
  linkButton: { alignSelf: "flex-start" },
  muted: { color: colors.textMuted },
});
