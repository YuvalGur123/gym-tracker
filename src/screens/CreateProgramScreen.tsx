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
    Animated,
    PanResponder,
    ScrollView,
} from "react-native";
import { Program, Exercise } from "../types";
import { reorderExercises } from "../db/database";

type Props = {
    onSave: (program: Program) => void;
    navigation: any;
    route: any;
};

const ITEM_HEIGHT = 52;

export default function CreateProgramScreen({ onSave, navigation, route }: Props) {
    const existingProgram: Program | undefined = route.params?.program;
    const isEditing = !!existingProgram;

    const [name, setName] = useState(existingProgram?.name ?? "");
    const [exerciseName, setExerciseName] = useState("");
    const [exercises, setExercises] = useState<Exercise[]>(existingProgram?.exercises ?? []);
    const exerciseInputRef = useRef<TextInput>(null);

    // Drag state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragY = useRef(new Animated.Value(0)).current;
    const orderRef = useRef(exercises.map((e) => e.id));
    const dragIndexRef = useRef(-1);
    const dragStartY = useRef(0);

    React.useEffect(() => {
        orderRef.current = exercises.map((e) => e.id);
    }, [exercises]);

    function addExercise() {
        const trimmed = exerciseName.trim();
        if (!trimmed) return;
        const newEx = { id: Date.now().toString(), name: trimmed };
        setExercises((prev) => [...prev, newEx]);
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
        const id = existingProgram?.id ?? Date.now().toString();
        onSave({ id, name: name.trim(), exercises });
    }

    const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e]));

    function makePanResponder(id: string) {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
            onPanResponderGrant: () => {
                dragIndexRef.current = orderRef.current.indexOf(id);
                dragStartY.current = dragIndexRef.current * ITEM_HEIGHT;
                dragY.setValue(0);
                setDraggingId(id);
            },
            onPanResponderMove: (_, g) => {
                dragY.setValue(g.dy);
                const newIndex = Math.max(0, Math.min(
                    orderRef.current.length - 1,
                    Math.round((dragStartY.current + g.dy) / ITEM_HEIGHT)
                ));
                if (newIndex !== dragIndexRef.current) {
                    const next = [...orderRef.current];
                    next.splice(dragIndexRef.current, 1);
                    next.splice(newIndex, 0, id);
                    dragIndexRef.current = newIndex;
                    dragStartY.current = newIndex * ITEM_HEIGHT;
                    dragY.setValue(g.dy - (newIndex - orderRef.current.indexOf(id)) * ITEM_HEIGHT);
                    orderRef.current = next;
                    setExercises(next.map((eid) => exerciseMap[eid]).filter(Boolean));
                }
            },
            onPanResponderRelease: () => {
                setDraggingId(null);
                dragY.setValue(0);
            },
        });
    }

    const panResponders = useRef<Record<string, ReturnType<typeof PanResponder.create>>>({});
    exercises.forEach((e) => {
        if (!panResponders.current[e.id]) {
            panResponders.current[e.id] = makePanResponder(e.id);
        }
    });

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
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

                    {exercises.map((item, index) => {
                        const isDragging = draggingId === item.id;
                        const pan = panResponders.current[item.id];
                        return (
                            <Animated.View
                                key={item.id}
                                style={[
                                    styles.exerciseRow,
                                    isDragging && styles.exerciseRowDragging,
                                    isDragging && { transform: [{ translateY: dragY }], zIndex: 99 },
                                ]}
                            >
                                <Text style={styles.exerciseNum}>{index + 1}</Text>
                                <Text style={styles.exerciseName}>{item.name}</Text>
                                <TouchableOpacity onPress={() => removeExercise(item.id)} style={{ padding: 4 }}>
                                    <Text style={styles.removeBtn}>✕</Text>
                                </TouchableOpacity>
                                <View {...pan?.panHandlers} style={styles.dragHandle}>
                                    <Text style={styles.dragIcon}>☰</Text>
                                </View>
                            </Animated.View>
                        );
                    })}

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
                </ScrollView>
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
    sectionTitle: { color: "#e0ff4f", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 24, marginBottom: 8 },
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
        height: ITEM_HEIGHT,
    },
    exerciseRowDragging: {
        backgroundColor: "#242424",
        borderColor: "#e0ff4f",
        elevation: 10,
    },
    exerciseNum: { color: "#e0ff4f", fontWeight: "700", fontSize: 14, width: 24 },
    exerciseName: { flex: 1, color: "#fff", fontSize: 16 },
    removeBtn: { color: "#555", fontSize: 16 },
    dragHandle: { padding: 4, paddingLeft: 10 },
    dragIcon: { color: "#555", fontSize: 18 },
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