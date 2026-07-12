import React, { useState, memo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { LoggedSet } from "../types";
import { useTheme } from "../theme/ThemeContext";
import { useUnit } from "../theme/UnitContext";
import { ThemeColors } from "../theme/theme";

type Props = {
    exerciseName: string;
    sets: LoggedSet[];
    onAddSet: (weight: number, reps: number) => void;
    onDeleteSet: (setId: string) => void;
    lastWeight?: number;
    lastReps?: number;
    personalRecord?: number;
};

function fmt(n: number) {
    // Up to 1 decimal, no trailing .0
    return Number(n.toFixed(1)).toString();
}

const ExerciseCard = memo(function ExerciseCard({
    exerciseName, sets, onAddSet, onDeleteSet, lastWeight, lastReps, personalRecord,
}: Props) {
    const { colors } = useTheme();
    const { unit, kgToDisplay, displayToKg } = useUnit();
    const styles = getStyles(colors);
    const [weight, setWeight] = useState(lastWeight != null ? fmt(kgToDisplay(lastWeight)) : "");
    const [reps, setReps] = useState(lastReps ? String(lastReps) : "");

    function handleAddSet() {
        const w = parseFloat(weight);
        const r = parseInt(reps, 10);
        if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
        onAddSet(displayToKg(w), r); // always store in kg
        setReps("");
    }

    function handleWeightChange(text: string) {
        const cleaned = text.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        if (parts.length > 2) return;
        setWeight(cleaned);
    }

    function handleRepsChange(text: string) {
        const cleaned = text.replace(/[^0-9]/g, "");
        setReps(cleaned);
    }

    function handleDeleteSet(setId: string, index: number) {
        Alert.alert(
            "Delete Set",
            `Remove set ${index + 1}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDeleteSet(setId) },
            ]
        );
    }

    // Sets are stored in kg — compare in kg, display converted
    const bestSet = sets.length > 0
        ? sets.reduce((best, s) => s.weight > best.weight ? s : best, sets[0])
        : null;
    const isPR = bestSet && personalRecord && bestSet.weight > personalRecord;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{exerciseName}</Text>
                    {lastWeight != null && (
                        <Text style={styles.lastSession}>
                            Last: {fmt(kgToDisplay(lastWeight))}{unit} × {lastReps}
                        </Text>
                    )}
                </View>
                <View style={styles.headerRight}>
                    {isPR && <Text style={styles.prBadge}>🏆 PR</Text>}
                    {bestSet && (
                        <Text style={styles.best}>
                            Best: {fmt(kgToDisplay(bestSet.weight))}{unit} × {bestSet.reps}
                        </Text>
                    )}
                </View>
            </View>

            {sets.length > 0 && (
                <View style={styles.setsTable}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, styles.tableLabel, styles.setCol]}>Set</Text>
                        <Text style={[styles.tableCell, styles.tableLabel]}>Weight</Text>
                        <Text style={[styles.tableCell, styles.tableLabel]}>Reps</Text>
                        <Text style={[styles.tableCell, styles.tableLabel]}>Vol</Text>
                        <View style={styles.deleteCol} />
                    </View>
                    {sets.map((set, i) => (
                        <View key={set.id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.setCol]}>{i + 1}</Text>
                            <Text style={styles.tableCell}>{fmt(kgToDisplay(set.weight))}{unit}</Text>
                            <Text style={styles.tableCell}>{set.reps}</Text>
                            <Text style={[styles.tableCell, styles.volText]}>
                                {(kgToDisplay(set.weight) * set.reps).toFixed(0)}
                            </Text>
                            <TouchableOpacity
                                style={styles.deleteCol}
                                onPress={() => handleDeleteSet(set.id, i)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={styles.deleteSetBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder={unit}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={handleWeightChange}
                />
                <Text style={styles.x}>×</Text>
                <TextInput
                    style={styles.input}
                    placeholder="reps"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                    value={reps}
                    onChangeText={handleRepsChange}
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

const getStyles = (c: ThemeColors) => StyleSheet.create({
    card: {
        backgroundColor: c.card,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: c.cardBorder,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    name: { fontSize: 17, fontWeight: "700", color: c.text },
    lastSession: { fontSize: 12, color: c.textFaint, marginTop: 2 },
    headerRight: { alignItems: "flex-end", gap: 2 },
    prBadge: { fontSize: 12, fontWeight: "700", color: c.accent },
    best: { fontSize: 12, color: c.textDim, fontWeight: "600" },
    setsTable: { marginBottom: 12, backgroundColor: c.input, borderRadius: 8, overflow: "hidden" },
    tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.divider },
    tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.divider, alignItems: "center" },
    tableCell: { flex: 1, color: c.textDim, fontSize: 14, textAlign: "center" },
    tableLabel: { color: c.textFaint, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
    setCol: { flex: 0, width: 32, textAlign: "left" },
    deleteCol: { width: 32, alignItems: "center" },
    deleteSetBtn: { color: c.danger, fontSize: 13, fontWeight: "700" },
    volText: { color: c.accent },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    input: {
        flex: 1,
        backgroundColor: c.input,
        borderWidth: 1,
        borderColor: c.cardBorder,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        color: c.text,
        fontSize: 16,
        textAlign: "center",
    },
    x: { color: c.textFaint, fontSize: 16 },
    addBtn: {
        backgroundColor: c.accent,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    addBtnText: { color: c.accentText, fontWeight: "700", fontSize: 14 },
});