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
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/theme";

type Props = {
    onSave: (program: Program) => void;
    navigation: any;
    route: any;
};

const ITEM_HEIGHT = 64;

export default function CreateProgramScreen({ onSave, navigation, route }: Props) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
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
                                placeholderTextColor={colors.textFaint}
                                value={name}
                                onChangeText={setName}
                            />

                            <Text style={styles.label}>Add Exercise</Text>
                            <View style={styles.row}>
                                <TextInput
                                    ref={exerciseInputRef}
                                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                                    placeholder="e.g. Bench Press"
                                    placeholderTextColor={colors.textFaint}
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

const getStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    form: { padding: 20 },
    label: { color: c.textDim, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 16 },
    input: {
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.cardBorder,
        borderRadius: 10,
        padding: 14,
        color: c.text,
        fontSize: 16,
    },
    row: { flexDirection: "row", alignItems: "center" },
    addBtn: {
        backgroundColor: c.accent,
        width: 48,
        height: 48,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    addBtnText: { color: c.accentText, fontSize: 24, fontWeight: "700", lineHeight: 28 },
    sectionTitle: { color: c.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 24, marginBottom: 4 },
    exerciseRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: c.card,
        marginHorizontal: 20,
        marginBottom: 8,
        borderRadius: 10,
        paddingLeft: 14,
        borderWidth: 1,
        borderColor: c.cardBorder,
        height: ITEM_HEIGHT,
    },
    exerciseRowDragging: {
        borderColor: c.accent,
        elevation: 10,
    },
    exerciseNum: { color: c.accent, fontWeight: "700", fontSize: 14, width: 24 },
    exerciseName: { flex: 1, color: c.text, fontSize: 15 },
    removeBtn: { padding: 16 },
    removeBtnText: { color: c.textFaint, fontSize: 16 },
    dragHandle: { paddingHorizontal: 16, paddingVertical: 16 },
    dragIcon: { color: c.textDim, fontSize: 20 },
    footer: { padding: 20 },
    saveBtn: {
        backgroundColor: c.accent,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 8,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: c.accentText, fontWeight: "700", fontSize: 16 },
});