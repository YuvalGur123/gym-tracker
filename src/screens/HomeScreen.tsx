import React, { useState, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Animated,
    PanResponder,
    ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Program } from "../types";
import { reorderPrograms } from "../db/database";

type Props = {
    programs: Program[];
    onStartSession: (program: Program) => void;
    onDeleteProgram: (id: string) => void;
    onReorderPrograms: (ids: string[]) => void;
    navigation: any;
};

const ITEM_HEIGHT = 160;

function DraggableProgramList({ programs, onStartSession, onDeleteProgram, onReorderPrograms, navigation }: Props) {
    const [order, setOrder] = useState(() => programs.map((p) => p.id));
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragY = useRef(new Animated.Value(0)).current;
    const dragStartY = useRef(0);
    const dragIndex = useRef(-1);
    const currentOrder = useRef(order);

    // Sync order when programs prop changes (add/delete)
    React.useEffect(() => {
        const newOrder = programs.map((p) => p.id);
        setOrder(newOrder);
        currentOrder.current = newOrder;
    }, [programs]);

    const programMap = Object.fromEntries(programs.map((p) => [p.id, p]));

    function getIndex(id: string) {
        return currentOrder.current.indexOf(id);
    }

    function makePanResponder(id: string) {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
            onPanResponderGrant: (_, g) => {
                dragIndex.current = getIndex(id);
                dragStartY.current = dragIndex.current * ITEM_HEIGHT;
                dragY.setValue(0);
                setDraggingId(id);
            },
            onPanResponderMove: (_, g) => {
                dragY.setValue(g.dy);
                const newIndex = Math.max(0, Math.min(
                    currentOrder.current.length - 1,
                    Math.round((dragStartY.current + g.dy) / ITEM_HEIGHT)
                ));
                if (newIndex !== dragIndex.current) {
                    const next = [...currentOrder.current];
                    next.splice(dragIndex.current, 1);
                    next.splice(newIndex, 0, id);
                    dragIndex.current = newIndex;
                    dragStartY.current = newIndex * ITEM_HEIGHT;
                    dragY.setValue(g.dy - (newIndex - getIndex(id)) * ITEM_HEIGHT);
                    currentOrder.current = next;
                    setOrder(next);
                }
            },
            onPanResponderRelease: () => {
                setDraggingId(null);
                dragY.setValue(0);
                onReorderPrograms(currentOrder.current);
            },
        });
    }

    // Cache pan responders so they don't recreate on every render
    const panResponders = useRef<Record<string, ReturnType<typeof PanResponder.create>>>({});
    programs.forEach((p) => {
        if (!panResponders.current[p.id]) {
            panResponders.current[p.id] = makePanResponder(p.id);
        }
    });

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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {order.map((id) => {
                const item = programMap[id];
                if (!item) return null;
                const isDragging = draggingId === id;
                const pan = panResponders.current[id];

                return (
                    <Animated.View
                        key={id}
                        style={[
                            styles.card,
                            isDragging && styles.cardDragging,
                            isDragging && { transform: [{ translateY: dragY }], zIndex: 99 },
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardName}>{item.name}</Text>
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate("CreateProgram", { program: item })}
                                    style={styles.actionBtn}
                                >
                                    <Text style={styles.editBtn}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtn}>
                                    <Text style={styles.deleteBtn}>✕</Text>
                                </TouchableOpacity>
                                <View {...pan.panHandlers} style={styles.dragHandle}>
                                    <Text style={styles.dragIcon}>☰</Text>
                                </View>
                            </View>
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
                    </Animated.View>
                );
            })}
        </ScrollView>
    );
}

export default function HomeScreen({ programs, onStartSession, onDeleteProgram, onReorderPrograms, navigation }: Props) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
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
                <DraggableProgramList
                    programs={programs}
                    onStartSession={onStartSession}
                    onDeleteProgram={onDeleteProgram}
                    onReorderPrograms={onReorderPrograms}
                    navigation={navigation}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f0f" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
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
    cardDragging: {
        backgroundColor: "#242424",
        borderColor: "#e0ff4f",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    cardName: { fontSize: 20, fontWeight: "700", color: "#fff", flex: 1 },
    cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    actionBtn: { padding: 4 },
    editBtn: { fontSize: 16 },
    deleteBtn: { color: "#555", fontSize: 18, paddingHorizontal: 4 },
    dragHandle: { padding: 4, paddingLeft: 8 },
    dragIcon: { color: "#555", fontSize: 18 },
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