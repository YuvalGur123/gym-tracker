import React, { useState, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Keyboard,
} from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { Program, Exercise } from "../types";

type Props = {
    onSave: (program: Program) => void;
    navigation: any;
    route: any;
};

const ITEM_HEIGHT = 64;

export default function CreateProgramScreen({ onSave, navigation, route }: Props) {
    const existingProgram: Program | undefined = route.params?.program;
    const isEditing = !!existingProgram;

    const [name, setName] = useState(existingProgram?.name ?? "");
    const [exerciseName, setExerciseName] = useState("");
    const [exercises, setExercises] = useState<Exercise[]>(existingProgram?.exercises ?? []);
    const exerciseInputRef = useRef<TextInput>(null);

    function addExercise() {
        const trimmed = exerciseName.trim();
        if (!trimmed) return;
        setExercises((prev) => [...prev, { id: Date.now().toString(), name: trimmed }]);
        setExerciseName("");
        exerciseInputRef.current?.focus();
    }

    function handleAddPress() {
        Keyboard.dismiss();
        addExercise();
    }

    function removeExercise(id: string) {
        setExercises((prev) => prev.filter((e) => e.id !== id));
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
        onSave({ id: existingProgram?.id ?? Date.now().toString(), name: name.trim(), exercises });
    }

    function renderExercise({ item, index, drag, isActive }: RenderItemParams<Exercise> & { index?: number }) {
        const i = exercises.findIndex((e) => e.id === item.id);
        return (
            <ScaleDecorator activeScale={1.02}>
                <View style={[styles.exerciseRow, isActive && styles.exerciseRowDragging]}>
                    <Text style={styles.exerciseNum}>{i + 1}</Text>
                    <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
                    <TouchableOpacity
                        onPress={() => removeExercise(item.id)}
                        style={styles.removeBtn}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onLongPress={drag}
                        delayLongPress={0}
                        style={styles.dragHandle}
                        activeOpacity={0.6}
                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    >
                        <Text style={styles.dragIcon}>☰</Text>
                    </TouchableOpacity>
                </View>
            </ScaleDecorator>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <DraggableFlatList
                    data={exercises}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data }) => setExercises(data)}
                    renderItem={renderExercise}
                    activationDistance={1}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 40 }}
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
                                    ref={exerciseInputRef}
                                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                                    placeholder="e.g. Bench Press"
                                    placeholderTextColor="#444"
                                    value={exerciseName}
                                    onChangeText={setExerciseName}
                                    onSubmitEditing={addExercise}
                                    returnKeyType="done"
                                    blurOnSubmit={false}
                                />
                                <TouchableOpacity style={styles.addBtn} onPressIn={handleAddPress}>
                                    <Text style={styles.addBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>

                            {exercises.length > 0 && (
                                <Text style={styles.sectionTitle}>
                                    Exercises ({exercises.length}) · hold ☰ to reorder
                                </Text>
                            )}
                        </View>
                    }
                    ListFooterComponent={
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[
                                    styles.saveBtn,
                                    (!name.trim() || exercises.length === 0) && styles.saveBtnDisabled,
                                ]}
                                onPress={saveProgram}
                            >
                                <Text style={styles.saveBtnText}>
                                    {isEditing ? "Save Changes" : "Save Program"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
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
    sectionTitle: { color: "#e0ff4f", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 24, marginBottom: 4 },
    exerciseRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        marginHorizontal: 20,
        marginBottom: 8,
        borderRadius: 10,
        paddingLeft: 14,
        borderWidth: 1,
        borderColor: "#2a2a2a",
        height: ITEM_HEIGHT,
    },
    exerciseRowDragging: {
        borderColor: "#e0ff4f",
        elevation: 10,
    },
    exerciseNum: { color: "#e0ff4f", fontWeight: "700", fontSize: 14, width: 24 },
    exerciseName: { flex: 1, color: "#fff", fontSize: 15 },
    removeBtn: { padding: 16 },
    removeBtnText: { color: "#555", fontSize: 16 },
    dragHandle: { paddingHorizontal: 16, paddingVertical: 16 },
    dragIcon: { color: "#888", fontSize: 20 },
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