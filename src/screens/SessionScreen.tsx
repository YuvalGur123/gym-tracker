import React, { useState, useMemo, useCallback, useRef } from "react";
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

export default function SessionScreen({ route, navigation }: any) {
    const session = useMemo(() => ({
        id: Date.now().toString(),
        program: route.params.session.program,
        date: new Date().toISOString(),
    }), []);

    // Store logs in a ref so callbacks don't recreate on every render,
    // but also mirror to state so the UI still updates after addSet.
    const logsRef = useRef<ExerciseLog[]>([]);
    const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
    const [saved, setSaved] = useState(false);

    // useCallback so the function reference stays stable across renders —
    // this is what lets memo(ExerciseCard) actually skip re-renders.
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

    function handleEndSession() {
        const logs = logsRef.current;
        const totalSets = logs.reduce((acc, l) => acc + l.sets.length, 0);

        Alert.alert(
            "End Session",
            totalSets === 0
                ? "You haven't logged any sets. End anyway?"
                : `Save session with ${totalSets} set${totalSets !== 1 ? "s" : ""}?`,
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

    // Stable per-exercise callbacks so memo(ExerciseCard) doesn't see new refs
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
                <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
                    <Text style={styles.endBtnText}>End</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={session.program.exercises}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
                // Disable scroll-to-top on state change — prevents jumpy keyboard behaviour
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                // Don't remount cards when list scrolls off screen
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
    endBtn: {
        backgroundColor: "#ff4f4f",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    endBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
