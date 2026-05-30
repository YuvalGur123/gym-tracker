import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
} from "react-native";
import { ExerciseLog } from "../types";
import { saveSession } from "../db/database";
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

export default function SessionScreen({ route, navigation }: any) {
    const session = useMemo(() => ({
        id: Date.now().toString(),
        program: route.params.session.program,
        date: new Date().toISOString(),
    }), []);

    const logsRef = useRef<ExerciseLog[]>([]);
    const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
    const [saved, setSaved] = useState(false);
    const { display: timerDisplay, elapsed } = useTimer();

    const addSet = useCallback((exerciseId: string, exerciseName: string, weight: number, reps: number) => {
        const current = logsRef.current;
        const existing = current.find((log) => log.exerciseId === exerciseId);
        const newSet = { id: Date.now().toString(), weight, reps };

        let next: ExerciseLog[];
        if (!existing) {
            next = [...current, { exerciseId, exerciseName, sets: [newSet] }];
        } else {
            next = current.map((log) =>
                log.exerciseId === exerciseId
                    ? { ...log, sets: [...log.sets, newSet] }
                    : log
            );
        }
        logsRef.current = next;
        setExerciseLogs(next);
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

    const callbacksRef = useRef<Record<string, (w: number, r: number) => void>>({});
    session.program.exercises.forEach((ex: { id: string; name: string }) => {
        if (!callbacksRef.current[ex.id]) {
            callbacksRef.current[ex.id] = (w: number, r: number) => addSet(ex.id, ex.name, w, r);
        }
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.programLabel}>{session.program.name}</Text>
                    <Text style={styles.stats}>
                        {totalSets} set{totalSets !== 1 ? "s" : ""} logged
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.timer}>{timerDisplay}</Text>
                    <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
                        <Text style={styles.endBtnText}>End</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={session.program.exercises}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                removeClippedSubviews={false}
                renderItem={({ item }) => {
                    const log = exerciseLogs.find((l) => l.exerciseId === item.id);
                    return (
                        <ExerciseCard
                            exerciseName={item.name}
                            sets={log?.sets ?? []}
                            onAddSet={callbacksRef.current[item.id]}
                        />
                    );
                }}
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
    timer: {
        fontSize: 18,
        fontWeight: "700",
        color: "#e0ff4f",
        fontVariant: ["tabular-nums"],
    },
    endBtn: {
        backgroundColor: "#ff4f4f",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    endBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});