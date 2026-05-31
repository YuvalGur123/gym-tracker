import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
} from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { ExerciseLog } from "../types";
import { saveSession, loadExerciseHistory } from "../db/database";
import ExerciseCard from "../components/ExerciseCard";

function useTimer() {
    const [elapsed, setElapsed] = useState(0);
    const startTime = useRef(Date.now());
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    const display = hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return { display, elapsed };
}

type ExerciseMeta = { lastWeight?: number; lastReps?: number; personalRecord?: number };
type Exercise = { id: string; name: string };

export default function SessionScreen({ route, navigation }: any) {
    const session = useMemo(() => ({
        id: Date.now().toString(),
        program: route.params.session.program,
        date: new Date().toISOString(),
    }), []);

    // Exercises as state so we can reorder mid-session
    const [exercises, setExercises] = useState<Exercise[]>(session.program.exercises);

    const logsRef = useRef<ExerciseLog[]>([]);
    const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
    const [saved, setSaved] = useState(false);
    const [exerciseMeta, setExerciseMeta] = useState<Record<string, ExerciseMeta>>({});
    const { display: timerDisplay, elapsed } = useTimer();

    useEffect(() => {
        const meta: Record<string, ExerciseMeta> = {};
        for (const ex of session.program.exercises) {
            const history = loadExerciseHistory(ex.name);
            if (history.length === 0) continue;
            const lastSession = history[history.length - 1];
            if (lastSession.sets.length > 0) {
                const lastSet = lastSession.sets[lastSession.sets.length - 1];
                meta[ex.id] = { lastWeight: lastSet.weight, lastReps: lastSet.reps };
            }
            let pr = 0;
            for (const h of history) for (const s of h.sets) if (s.weight > pr) pr = s.weight;
            if (pr > 0) meta[ex.id] = { ...meta[ex.id], personalRecord: pr };
        }
        setExerciseMeta(meta);
    }, []);

    const addSet = useCallback((exerciseId: string, exerciseName: string, weight: number, reps: number) => {
        const current = logsRef.current;
        const existing = current.find((log) => log.exerciseId === exerciseId);
        const newSet = { id: Date.now().toString(), weight, reps };
        const next = existing
            ? current.map((log) =>
                log.exerciseId === exerciseId
                    ? { ...log, sets: [...log.sets, newSet] }
                    : log
            )
            : [...current, { exerciseId, exerciseName, sets: [newSet] }];
        logsRef.current = next;
        setExerciseLogs([...next]);
    }, []);

    const deleteSet = useCallback((exerciseId: string, setId: string) => {
        const current = logsRef.current;
        const next = current.map((log) =>
            log.exerciseId === exerciseId
                ? { ...log, sets: log.sets.filter((s) => s.id !== setId) }
                : log
        ).filter((log) => log.sets.length > 0);
        logsRef.current = next;
        setExerciseLogs([...next]);
    }, []);

    function formatDuration(seconds: number) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m`;
        return `${seconds}s`;
    }

    function handleEndSession() {
        const logs = logsRef.current;
        const totalSets = logs.reduce((acc, l) => acc + l.sets.length, 0);
        Alert.alert(
            "End Session",
            totalSets === 0
                ? "You haven't logged any sets. End anyway?"
                : `Save session with ${totalSets} set${totalSets !== 1 ? "s" : ""} · ${formatDuration(elapsed)}?`,
            [
                { text: "Keep Going", style: "cancel" },
                {
                    text: "End Session",
                    style: totalSets === 0 ? "destructive" : "default",
                    onPress: () => {
                        if (!saved) {
                            saveSession({ ...session, exerciseLogs: logs });
                            setSaved(true);
                        }
                        navigation.popToTop();
                    },
                },
            ]
        );
    }

    const totalSets = exerciseLogs.reduce((acc, l) => acc + l.sets.length, 0);

    // Stable callbacks per exercise
    const addCallbacks = useRef<Record<string, (w: number, r: number) => void>>({});
    const deleteCallbacks = useRef<Record<string, (setId: string) => void>>({});
    exercises.forEach((ex) => {
        if (!addCallbacks.current[ex.id]) {
            addCallbacks.current[ex.id] = (w, r) => addSet(ex.id, ex.name, w, r);
        }
        if (!deleteCallbacks.current[ex.id]) {
            deleteCallbacks.current[ex.id] = (setId) => deleteSet(ex.id, setId);
        }
    });

    function renderItem({ item, drag, isActive }: RenderItemParams<Exercise>) {
        const log = exerciseLogs.find((l) => l.exerciseId === item.id);
        const meta = exerciseMeta[item.id];
        return (
            <ScaleDecorator activeScale={1.01}>
                <View style={[styles.cardWrapper, isActive && styles.cardWrapperDragging]}>
                    <TouchableOpacity
                        onLongPress={drag}
                        delayLongPress={0}
                        style={styles.dragHandle}
                        activeOpacity={0.6}
                    >
                        <Text style={styles.dragIcon}>☰</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <ExerciseCard
                            exerciseName={item.name}
                            sets={log?.sets ?? []}
                            onAddSet={addCallbacks.current[item.id]}
                            onDeleteSet={deleteCallbacks.current[item.id]}
                            lastWeight={meta?.lastWeight}
                            lastReps={meta?.lastReps}
                            personalRecord={meta?.personalRecord}
                        />
                    </View>
                </View>
            </ScaleDecorator>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.programLabel}>{session.program.name}</Text>
                    <Text style={styles.stats}>{totalSets} set{totalSets !== 1 ? "s" : ""} logged</Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.timer}>{timerDisplay}</Text>
                    <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
                        <Text style={styles.endBtnText}>End</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <DraggableFlatList
                data={exercises}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => setExercises(data)}
                renderItem={renderItem}
                activationDistance={1}
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
                removeClippedSubviews={false}
                keyboardShouldPersistTaps="handled"
            />
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
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#1e1e1e",
    },
    programLabel: { fontSize: 20, fontWeight: "700", color: "#fff" },
    stats: { fontSize: 13, color: "#888", marginTop: 2 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    timer: { fontSize: 18, fontWeight: "700", color: "#e0ff4f", fontVariant: ["tabular-nums"] },
    endBtn: { backgroundColor: "#ff4f4f", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    endBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    cardWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    cardWrapperDragging: {
        opacity: 0.95,
    },
    dragHandle: {
        paddingHorizontal: 4,
        paddingVertical: 20,
    },
    dragIcon: { color: "#555", fontSize: 20 },
});