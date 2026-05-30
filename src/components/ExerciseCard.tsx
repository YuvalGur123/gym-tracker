import React, { useState, memo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { LoggedSet } from "../types";

type Props = {
    exerciseName: string;
    sets: LoggedSet[];
    onAddSet: (weight: number, reps: number) => void;
};

// memo prevents re-render unless sets array or callbacks change
const ExerciseCard = memo(function ExerciseCard({ exerciseName, sets, onAddSet }: Props) {
    const [weight, setWeight] = useState("");
    const [reps, setReps] = useState("");

    function handleAddSet() {
        const w = parseFloat(weight);
        const r = parseInt(reps, 10);
        if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
        onAddSet(w, r);
        setWeight("");
        setReps("");
    }

    const bestSet = sets.length > 0
        ? sets.reduce((best, s) => s.weight * s.reps > best.weight * best.reps ? s : best, sets[0])
        : null;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.name}>{exerciseName}</Text>
                {bestSet && (
                    <Text style={styles.best}>
                        Best: {bestSet.weight}kg × {bestSet.reps}
                    </Text>
                )}
            </View>

            {sets.length > 0 && (
                <View style={styles.setsTable}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, styles.tableLabel]}>Set</Text>
                        <Text style={[styles.tableCell, styles.tableLabel]}>Weight</Text>
                        <Text style={[styles.tableCell, styles.tableLabel]}>Reps</Text>
                        <Text style={[styles.tableCell, styles.tableLabel]}>Vol</Text>
                    </View>
                    {sets.map((set, i) => (
                        <View key={set.id} style={styles.tableRow}>
                            <Text style={styles.tableCell}>{i + 1}</Text>
                            <Text style={styles.tableCell}>{set.weight}kg</Text>
                            <Text style={styles.tableCell}>{set.reps}</Text>
                            <Text style={[styles.tableCell, styles.volText]}>
                                {(set.weight * set.reps).toFixed(0)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="kg"
                    placeholderTextColor="#444"
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                />
                <Text style={styles.x}>×</Text>
                <TextInput
                    style={styles.input}
                    placeholder="reps"
                    placeholderTextColor="#444"
                    keyboardType="number-pad"
                    value={reps}
                    onChangeText={setReps}
                    onSubmitEditing={handleAddSet}
                    returnKeyType="done"
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddSet}>
                    <Text style={styles.addBtnText}>+ Set</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default ExerciseCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#1a1a1a",
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2a2a2a",
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    name: { fontSize: 17, fontWeight: "700", color: "#fff", flex: 1 },
    best: { fontSize: 12, color: "#e0ff4f", fontWeight: "600" },
    setsTable: { marginBottom: 12, backgroundColor: "#141414", borderRadius: 8, overflow: "hidden" },
    tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#222" },
    tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1e1e1e" },
    tableCell: { flex: 1, color: "#ccc", fontSize: 14, textAlign: "center" },
    tableLabel: { color: "#555", fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
    volText: { color: "#e0ff4f" },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    input: {
        flex: 1,
        backgroundColor: "#111",
        borderWidth: 1,
        borderColor: "#2a2a2a",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        color: "#fff",
        fontSize: 16,
        textAlign: "center",
    },
    x: { color: "#555", fontSize: 16 },
    addBtn: {
        backgroundColor: "#e0ff4f",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    addBtnText: { color: "#0f0f0f", fontWeight: "700", fontSize: 14 },
});
