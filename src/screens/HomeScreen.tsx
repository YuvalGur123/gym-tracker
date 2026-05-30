import React from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
} from "react-native";
import { Program } from "../types";

type Props = {
    programs: Program[];
    onStartSession: (program: Program) => void;
    onDeleteProgram: (id: string) => void;
    navigation: any;
};

export default function HomeScreen({ programs, onStartSession, onDeleteProgram, navigation }: Props) {
    function confirmDelete(program: Program) {
        Alert.alert(
            "Delete Program",
            `Delete "${program.name}"? This won't affect past sessions.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDeleteProgram(program.id) },
            ]
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Programs</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate("CreateProgram", {})}
                >
                    <Text style={styles.addBtnText}>+ New</Text>
                </TouchableOpacity>
            </View>

            {programs.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🏋️</Text>
                    <Text style={styles.emptyTitle}>No programs yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Create your first program to start tracking
                    </Text>
                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={() => navigation.navigate("CreateProgram", {})}
                    >
                        <Text style={styles.createBtnText}>Create Program</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={programs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardName}>{item.name}</Text>
                                <TouchableOpacity onPress={() => confirmDelete(item)}>
                                    <Text style={styles.deleteBtn}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.cardExercises}>
                                {item.exercises.map((e) => e.name).join(" · ")}
                            </Text>
                            <Text style={styles.cardCount}>
                                {item.exercises.length} exercise{item.exercises.length !== 1 ? "s" : ""}
                            </Text>
                            <TouchableOpacity
                                style={styles.startBtn}
                                onPress={() => onStartSession(item)}
                            >
                                <Text style={styles.startBtnText}>▶ Start Session</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f0f" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    title: { fontSize: 28, fontWeight: "800", color: "#fff" },
    addBtn: {
        backgroundColor: "#e0ff4f",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addBtnText: { color: "#0f0f0f", fontWeight: "700", fontSize: 14 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    emptyIcon: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: "#666", textAlign: "center", marginBottom: 32 },
    createBtn: {
        backgroundColor: "#e0ff4f",
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
    },
    createBtnText: { color: "#0f0f0f", fontWeight: "700", fontSize: 16 },
    card: {
        backgroundColor: "#1a1a1a",
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: "#2a2a2a",
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    cardName: { fontSize: 20, fontWeight: "700", color: "#fff", flex: 1 },
    deleteBtn: { color: "#555", fontSize: 18, paddingLeft: 12 },
    cardExercises: { fontSize: 13, color: "#888", marginBottom: 4 },
    cardCount: { fontSize: 12, color: "#555", marginBottom: 14 },
    startBtn: {
        backgroundColor: "#e0ff4f",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
    },
    startBtnText: { color: "#0f0f0f", fontWeight: "700", fontSize: 15 },
});
