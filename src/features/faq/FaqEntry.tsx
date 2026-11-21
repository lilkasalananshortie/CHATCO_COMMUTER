import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFaqs, groupFaqs, type FaqItem } from "../../core/api/faq-service";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { Text, TextInput } from "../../shared/ui/BrandText";
import { ProfileIcon } from "../profile/ProfileIcon";

export function FaqEntry({ rowStyle, textStyle, iconColor }: { rowStyle: StyleProp<ViewStyle>; textStyle: StyleProp<TextStyle>; iconColor: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open frequently asked questions" onPress={() => setOpen(true)} style={rowStyle}>
      <Text style={textStyle}>Frequently Asked Questions</Text>
      <ProfileIcon name="chevron" size={16} color={iconColor} />
    </TouchableOpacity>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      {open && <FaqScreen onClose={() => setOpen(false)} />}
    </Modal>
  </>;
}

function FaqScreen({ onClose }: { onClose: () => void }) {
  const { colors } = useCommuterTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    getFaqs().then((faqs) => { if (!cancelled) setItems(faqs); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const groups = useMemo(() => groupFaqs(items, search), [items, search]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Settings" onPress={onClose} hitSlop={8} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.textPrimary }]}>FAQs</Text>
      </View>

      {!loading && !failed && items.length > 0 && (
        <View style={styles.searchArea}>
          <View style={[styles.search, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="search" size={17} color={colors.textMuted} />
            <TextInput
              accessibilityLabel="Search questions and answers"
              value={search}
              onChangeText={setSearch}
              placeholder="Search questions"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
            {!!search && (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : failed ? (
        <View style={styles.center}>
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>Couldn't load FAQs</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>Check your connection and try again.</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={[styles.retry, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>{items.length ? "No matching questions" : "No FAQs yet"}</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>{items.length ? "Try a different word." : "Please check back later."}</Text>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}>
          {groups.map(group => (
            <View key={group.id} style={{ gap: 8 }}>
              <Text accessibilityRole="header" style={[styles.category, { color: colors.primaryLight }]}>{group.label}</Text>
              {group.items.map((item) => {
                const expanded = openId === item.id;
                return (
                  <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      onPress={() => setOpenId(expanded ? null : item.id)}
                      style={styles.question}
                    >
                      <Text style={[styles.questionText, { color: colors.textPrimary }]}>{item.question}</Text>
                      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                    </Pressable>
                    {expanded && <Text style={[styles.answer, { color: colors.textSecondary }]}>{item.answer}</Text>}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomWidth: 1 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 18, fontWeight: "700" },
  searchArea: { paddingHorizontal: 16, paddingTop: 14 },
  search: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 12 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateText: { fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 4 },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 22, borderRadius: 10, marginTop: 16 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  category: { fontSize: 13, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  question: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  questionText: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: "600" },
  answer: { fontSize: 13, lineHeight: 21, paddingHorizontal: 14, paddingBottom: 14 },
});
