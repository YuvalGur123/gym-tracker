import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { Program } from "../types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/theme";

type Props = {
    programs: Program[];
    onStartSession: (program: Program) => void;
    onDeleteProgram: (id: string) => void;
    onReorderPrograms: (ids: string[]) => void;
    navigation: any;
};

export default function HomeScreen({ programs, onStartSession, onDeleteProgram, onReorderPrograms, navigation }: Props) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [data, setData] = useState(programs);

    React.useEffect(() => { setData(programs); }, [programs]);

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

    function renderItem({ item, drag, isActive }: RenderItemParams<Program>) {
        return (
            <ScaleDecorator activeScale={1.02}>
                <View style={[styles.card, isActive && styles.cardDragging]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardName}>{item.name}</Text>
                        <View style={styles.cardActions}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate("CreateProgram", { program: item })}
                                style={styles.actionBtn}
                            >
                                <Text style={styles.editIcon}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtn}>
                                <Text style={styles.deleteIcon}>✕</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onLongPress={drag}
                                delayLongPress={0}
                                style={styles.dragHandle}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.dragIcon}>☰</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.cardExercises} numberOfLines={2}>
                        {item.exercises.map((e) => e.name).join(" · ")}
                    </Text>
                    <Text style={styles.cardCount}>
                        {item.exercises.length} exercise{item.exercises.length !== 1 ? "s" : ""}
                    </Text>
                    <TouchableOpacity style={styles.startBtn} onPress={() => onStartSession(item)}>
                        <Text style={styles.startBtnText}>▶ Start Session</Text>
                    </TouchableOpacity>
                </View>
            </ScaleDecorator>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.title}>My Programs</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.settingsBtn}
                        onPress={() => navigation.navigate("Settings")}
                    >
                        <Text style={styles.settingsIcon}>⚙️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate("CreateProgram", {})}
                    >
                        <Text style={styles.addBtnText}>+ New</Text>
                    </TouchableOpacity>
                </View>
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
                <DraggableFlatList
                    data={data}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data: newData }) => {
                        setData(newData);
                        onReorderPrograms(newData.map((p) => p.id));
                    }}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                    activationDistance={1}
                />
            )}
        </View>
    );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    title: { fontSize: 28, fontWeight: "800", color: c.text },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    settingsBtn: { padding: 4 },
    settingsIcon: { fontSize: 22 },
    addBtn: {
        backgroundColor: c.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addBtnText: { color: c.accentText, fontWeight: "700", fontSize: 14 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    emptyIcon: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 22, fontWeight: "700", color: c.text, marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: c.textDim, textAlign: "center", marginBottom: 32 },
    createBtn: {
        backgroundColor: c.accent,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
    },
    createBtnText: { color: c.accentText, fontWeight: "700", fontSize: 16 },
    card: {
        backgroundColor: c.card,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: c.cardBorder,
    },
    cardDragging: {
        borderColor: c.accent,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 12,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    cardName: { fontSize: 20, fontWeight: "700", color: c.text, flex: 1 },
    cardActions: { flexDirection: "row", alignItems: "center" },
    actionBtn: { padding: 10 },
    editIcon: { fontSize: 16 },
    deleteIcon: { color: c.textFaint, fontSize: 18 },
    dragHandle: { padding: 10 },
    dragIcon: { color: c.textDim, fontSize: 20 },
    cardExercises: { fontSize: 13, color: c.textDim, marginBottom: 4 },
    cardCount: { fontSize: 12, color: c.textFaint, marginBottom: 14 },
    startBtn: {
        backgroundColor: c.accent,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
    },
    startBtnText: { color: c.accentText, fontWeight: "700", fontSize: 15 },
});