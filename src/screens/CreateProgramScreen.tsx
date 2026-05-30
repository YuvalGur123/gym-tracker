import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { Program, Exercise } from "../types";

type Props = {
    onSave: (program: Program) => void;
    navigation: any;
};

export default function CreateProgramScreen({ onSave, navigation }: Props) {
    const [name, setName] = useState("");
    const [exerciseName, setExerciseName] = useState("");
    const [exercises, setExercises] = useState<Exercise[]>([]);

    function addExercise() {
        const trimmed = exerciseName.trim();
        if (!trimmed) return;
        setExercises([...exercises, { id: Date.now().toString(), name: trimmed }]);
        setExerciseName("");
    }

    function removeExercise(id: string) {
        setExercises(exercises.filter((e) => e.id !== id));
    }

    function saveProgram() {
        if (!name.trim()) {
            Alert.alert("Missing name", "Please give your program a name.");
            return;
        }
        if (exercises.length === 0) {
            Alert.alert("No exercises", "Add at least one exercise.");
            return;
        }
        onSave({ id: Date.now().toString(), name: name.trim(), exercises });
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <FlatList
                    data={exercises}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        <View style={styles.form}>
                            <Text style={styles.label}>Program Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Push Day A"
                                placeholderTextColor="#444"
                                value={name}
                                onChangeText={setName}
                            />

                            <Text style={styles.label}>Add Exercise</Text>
                            <View style={styles.row}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                                    placeholder="e.g. Bench Press"
                                    placeholderTextColor="#444"
                                    value={exerciseName}
                                    onChangeText={setExerciseName}
                                    onSubmitEditing={addExercise}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity style={styles.addBtn} onPress={addExercise}>
                                    <Text style={styles.addBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>

                            {exercises.length > 0 && (
                                <Text style={styles.sectionTitle}>
                                    Exercises ({exercises.length})
                                </Text>
                            )}
                        </View>
                    }
                    renderItem={({ item, index }) => (
                        <View style={styles.exerciseRow}>
                            <Text style={styles.exerciseNum}>{index + 1}</Text>
                            <Text style={styles.exerciseName}>{item.name}</Text>
                            <TouchableOpacity onPress={() => removeExercise(item.id)}>
                                <Text style={styles.removeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    ListFooterComponent={
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[
                                    styles.saveBtn,
                                    (!name.trim() || exercises.length === 0) && styles.saveBtnDisabled,
                                ]}
                                onPress={saveProgram}
                            >
                                <Text style={styles.saveBtnText}>Save Program</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 40 }}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f0f" },
    form: { padding: 20 },
    label: { color: "#888", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 16 },
    input: {
        backgroundColor: "#1a1a1a",
        borderWidth: 1,
        borderColor: "#2a2a2a",
        borderRadius: 10,
        padding: 14,
        color: "#fff",
        fontSize: 16,
    },
    row: { flexDirection: "row", alignItems: "center" },
    addBtn: {
        backgroundColor: "#e0ff4f",
        width: 48,
        height: 48,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    addBtnText: { color: "#0f0f0f", fontSize: 24, fontWeight: "700", lineHeight: 28 },
    sectionTitle: { color: "#e0ff4f", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 24, marginBottom: 8 },
    exerciseRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        marginHorizontal: 20,
        marginBottom: 8,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: "#2a2a2a",
    },
    exerciseNum: { color: "#e0ff4f", fontWeight: "700", fontSize: 14, width: 24 },
    exerciseName: { flex: 1, color: "#fff", fontSize: 16 },
    removeBtn: { color: "#555", fontSize: 16 },
    footer: { padding: 20 },
    saveBtn: {
        backgroundColor: "#e0ff4f",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 8,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: "#0f0f0f", fontWeight: "700", fontSize: 16 },
});
