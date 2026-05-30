import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { loadSessionSummaries, SessionSummary } from "../db/database";

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

export default function HistoryScreen() {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);

    useFocusEffect(
        useCallback(() => {
            setSessions(loadSessionSummaries());
        }, [])
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
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
                        <View style={styles.card}>
                            <View style={styles.cardLeft}>
                                <Text style={styles.programName}>{item.programName}</Text>
                                <Text style={styles.date}>{formatDate(item.date)}</Text>
                            </View>
                            <Text style={styles.timeAgo}>{timeAgo(item.date)}</Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f0f" },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    title: { fontSize: 28, fontWeight: "800", color: "#fff" },
    subtitle: { fontSize: 13, color: "#555", marginTop: 4 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: "#666", textAlign: "center" },
    card: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2a2a2a",
    },
    cardLeft: { flex: 1 },
    programName: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 4 },
    date: { fontSize: 13, color: "#666" },
    timeAgo: { fontSize: 13, color: "#e0ff4f", fontWeight: "600" },
});
