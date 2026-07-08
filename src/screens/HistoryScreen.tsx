import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { loadSessionSummaries, loadSessionDetail, deleteSession, SessionSummary, SessionDetail } from "../db/database";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/theme";

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function SessionDetailModal({ session, onClose, onDelete, colors }: {
    session: SessionDetail; onClose: () => void; onDelete: () => void; colors: ThemeColors;
}) {
    const insets = useSafeAreaInsets();
    const modal = getModalStyles(colors);
    const totalSets = session.exercises.reduce((acc, e) => acc + e.sets.length, 0);
    const totalVolume = session.exercises.reduce((acc, e) =>
        acc + e.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0
    );

    function confirmDelete() {
        Alert.alert(
            "Delete Session",
            "Permanently delete this session? This can't be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: onDelete },
            ]
        );
    }

    return (
        <Modal animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={[modal.container, { paddingTop: insets.top }]}>
                <View style={modal.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={modal.title}>{session.programName}</Text>
                        <Text style={modal.subtitle}>{formatDate(session.date)}</Text>
                    </View>
                    <TouchableOpacity onPress={confirmDelete} style={modal.deleteBtn}>
                        <Text style={modal.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
                        <Text style={modal.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <View style={modal.stats}>
                    <View style={modal.statBox}>
                        <Text style={modal.statValue}>{totalSets}</Text>
                        <Text style={modal.statLabel}>SETS</Text>
                    </View>
                    <View style={modal.statBox}>
                        <Text style={modal.statValue}>{session.exercises.length}</Text>
                        <Text style={modal.statLabel}>EXERCISES</Text>
                    </View>
                    <View style={modal.statBox}>
                        <Text style={modal.statValue}>{totalVolume.toFixed(0)}</Text>
                        <Text style={modal.statLabel}>VOLUME (kg)</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
                    {session.exercises.map((ex, i) => (
                        <View key={i} style={modal.exerciseCard}>
                            <Text style={modal.exerciseName}>{ex.name}</Text>
                            <View style={modal.tableHeader}>
                                <Text style={[modal.cell, modal.headerCell]}>Set</Text>
                                <Text style={[modal.cell, modal.headerCell]}>Weight</Text>
                                <Text style={[modal.cell, modal.headerCell]}>Reps</Text>
                                <Text style={[modal.cell, modal.headerCell]}>Vol</Text>
                            </View>
                            {ex.sets.map((set, j) => (
                                <View key={j} style={modal.tableRow}>
                                    <Text style={modal.cell}>{j + 1}</Text>
                                    <Text style={modal.cell}>{set.weight}kg</Text>
                                    <Text style={modal.cell}>{set.reps}</Text>
                                    <Text style={[modal.cell, modal.volText]}>
                                        {(set.weight * set.reps).toFixed(0)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
}

export default function HistoryScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);

    useFocusEffect(
        useCallback(() => {
            setSessions(loadSessionSummaries());
        }, [])
    );

    function openSession(id: string) {
        const detail = loadSessionDetail(id);
        if (detail) setSelectedSession(detail);
    }

    function handleDeleteSession() {
        if (!selectedSession) return;
        deleteSession(selectedSession.id);
        setSessions((prev) => prev.filter((s) => s.id !== selectedSession.id));
        setSelectedSession(null);
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.title}>History</Text>
                <Text style={styles.subtitle}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</Text>
            </View>

            {sessions.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyTitle}>No sessions yet</Text>
                    <Text style={styles.emptySubtitle}>Complete a workout to see it here</Text>
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => openSession(item.id)}>
                            <View style={styles.cardLeft}>
                                <Text style={styles.programName}>{item.programName}</Text>
                                <Text style={styles.date}>{formatDate(item.date)}</Text>
                            </View>
                            <View style={styles.cardRight}>
                                <Text style={styles.timeAgo}>{timeAgo(item.date)}</Text>
                                <Text style={styles.chevron}>›</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {selectedSession && (
                <SessionDetailModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                    onDelete={handleDeleteSession}
                    colors={colors}
                />
            )}
        </View>
    );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: 20, paddingBottom: 12 },
    title: { fontSize: 28, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 13, color: c.textFaint, marginTop: 4 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: c.text, marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: c.textDim, textAlign: "center" },
    card: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: c.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: c.cardBorder,
    },
    cardLeft: { flex: 1 },
    cardRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    programName: { fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 4 },
    date: { fontSize: 13, color: c.textDim },
    timeAgo: { fontSize: 13, color: c.accent, fontWeight: "600" },
    chevron: { fontSize: 20, color: c.textFaint },
});

const getModalStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
    },
    title: { fontSize: 22, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 13, color: c.textFaint, marginTop: 4 },
    closeBtn: { padding: 8 },
    closeBtnText: { color: c.textFaint, fontSize: 20 },
    deleteBtn: { padding: 8 },
    deleteBtnText: { fontSize: 20 },
    stats: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
    },
    statBox: {
        flex: 1,
        backgroundColor: c.card,
        borderRadius: 10,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: c.cardBorder,
    },
    statValue: { fontSize: 22, fontWeight: "800", color: c.accent },
    statLabel: { fontSize: 10, color: c.textFaint, fontWeight: "600", textTransform: "uppercase", marginTop: 2 },
    exerciseCard: {
        backgroundColor: c.card,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: c.cardBorder,
    },
    exerciseName: { fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 10 },
    tableHeader: { flexDirection: "row", marginBottom: 4 },
    tableRow: { flexDirection: "row", paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.divider },
    cell: { flex: 1, color: c.textDim, fontSize: 14, textAlign: "center" },
    headerCell: { color: c.textFaint, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
    volText: { color: c.accent },
});