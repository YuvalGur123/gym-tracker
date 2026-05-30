import React, { useCallback, useState, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
    loadAllExerciseNames,
    loadExerciseHistory,
    ExerciseHistory,
    loadAllProgramNames,
    loadProgramHistory,
    ProgramSessionPoint,
} from "../db/database";

const Y_AXIS_W = 44;
const CHART_H = 160;
const DOT_R = 5;

type ExerciseMetric = "maxWeight" | "totalVolume";
type ProgramMetric = "maxWeight" | "totalVolume";
type ViewMode = "exercise" | "program";

// ── Helpers ───────────────────────────────────────────────

function shortDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// If multiple points share the same calendar date, label by session number instead
function makeXLabels(dates: string[]): string[] {
    const dayStrings = dates.map((d) => shortDate(d));
    const hasDuplicates = new Set(dayStrings).size < dayStrings.length;
    if (hasDuplicates) {
        return dates.map((_, i) => `S${i + 1}`);
    }
    return dayStrings;
}

// ── Shared line chart (pure RN views) ─────────────────────

function LineChart({ values, labels }: { values: number[]; labels: string[] }) {
    const [chartW, setChartW] = useState(0);

    if (values.length < 2) {
        return (
            <View style={chartStyles.placeholder}>
                <Text style={chartStyles.placeholderText}>
                    Log at least 2 sessions to see a trend
                </Text>
            </View>
        );
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pts = chartW > 0 ? values.map((v, i) => ({
        x: DOT_R + (i / (values.length - 1)) * (chartW - DOT_R * 2),
        y: CHART_H - ((v - min) / range) * (CHART_H - 20) - 10,
    })) : [];

    const segments = pts.slice(0, -1).map((p, i) => {
        const next = pts[i + 1];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return { x: p.x, y: p.y, length, angle };
    });

    return (
        <View style={chartStyles.container}>
            <View style={chartStyles.plotRow}>
                <View style={chartStyles.yAxis}>
                    <Text style={chartStyles.yLabel}>{max.toFixed(0)}</Text>
                    <Text style={chartStyles.yLabel}>{((max + min) / 2).toFixed(0)}</Text>
                    <Text style={chartStyles.yLabel}>{min.toFixed(0)}</Text>
                </View>

                <View
                    style={{ flex: 1, height: CHART_H, overflow: "hidden" }}
                    onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
                >
                    {[0.15, 0.5, 0.85].map((t, i) => (
                        <View key={i} style={[chartStyles.gridLine, { top: t * CHART_H }]} />
                    ))}

                    {segments.map((seg, i) => (
                        <View
                            key={i}
                            style={{
                                position: "absolute",
                                left: seg.x,
                                top: seg.y - 1,
                                width: seg.length,
                                height: 2,
                                backgroundColor: "#e0ff4f",
                                transformOrigin: "left center",
                                transform: [{ rotate: `${seg.angle}deg` }],
                            }}
                        />
                    ))}

                    {pts.map((p, i) => (
                        <View
                            key={i}
                            style={[chartStyles.dot, { left: p.x - DOT_R, top: p.y - DOT_R }]}
                        />
                    ))}
                </View>
            </View>

            {/* X labels row aligned under plot area */}
            <View style={chartStyles.xLabelsRow}>
                <View style={{ width: Y_AXIS_W }} />
                <View style={[chartStyles.xLabels, { flex: 1 }]}>
                    <Text style={chartStyles.xLabel}>{labels[0]}</Text>
                    <Text style={chartStyles.xLabel}>{labels[labels.length - 1]}</Text>
                </View>
            </View>
        </View>
    );
}

const chartStyles = StyleSheet.create({
    container: { flexDirection: "column", marginVertical: 8 },
    plotRow: { flexDirection: "row" },
    xLabelsRow: { flexDirection: "row", marginTop: 6 },
    placeholder: { height: CHART_H, justifyContent: "center", alignItems: "center", backgroundColor: "#141414", borderRadius: 8, width: "100%" },
    placeholderText: { color: "#555", fontSize: 13 },
    yAxis: { width: Y_AXIS_W, height: CHART_H, justifyContent: "space-between", alignItems: "flex-end", paddingRight: 6 },
    yLabel: { color: "#555", fontSize: 10 },
    gridLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "#1e1e1e" },
    dot: { position: "absolute", width: DOT_R * 2, height: DOT_R * 2, borderRadius: DOT_R, backgroundColor: "#e0ff4f" },
    xLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    xLabel: { color: "#555", fontSize: 11 },
});

// ── Exercise view ─────────────────────────────────────────

type ExerciseDataPoint = { date: string; maxWeight: number; totalVolume: number };

function processExerciseHistory(history: ExerciseHistory[]): ExerciseDataPoint[] {
    return history.map((h) => ({
        date: h.date,
        maxWeight: Math.max(...h.sets.map((s) => s.weight)),
        totalVolume: h.sets.reduce((acc, s) => acc + s.weight * s.reps, 0),
    }));
}

function ExerciseView() {
    const [names, setNames] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [history, setHistory] = useState<ExerciseHistory[]>([]);
    const [metric, setMetric] = useState<ExerciseMetric>("maxWeight");

    useFocusEffect(
        useCallback(() => {
            const n = loadAllExerciseNames();
            setNames(n);
            const target = selected && n.includes(selected) ? selected : n[0] ?? null;
            if (target) { setSelected(target); setHistory(loadExerciseHistory(target)); }
        }, [selected])
    );

    function select(name: string) { setSelected(name); setHistory(loadExerciseHistory(name)); }

    const data = useMemo(() => processExerciseHistory(history), [history]);
    const values = data.map((d) => d[metric]);
    const dates = data.map((d) => d.date);
    const labels = makeXLabels(dates);
    const latest = values[values.length - 1] ?? null;
    const first = values[0] ?? null;
    const change = latest !== null && first !== null && values.length > 1
        ? ((latest - first) / (first || 1)) * 100 : null;

    if (names.length === 0) return <EmptyState />;

    return (
        <>
            <Picker names={names} selected={selected} onSelect={select} />

            <MetricToggle
                options={[
                    { key: "maxWeight", label: "Max Weight" },
                    { key: "totalVolume", label: "Total Volume" },
                ]}
                active={metric}
                onChange={(k) => setMetric(k as ExerciseMetric)}
            />

            {data.length > 0 && (
                <StatsRow
                    latest={latest}
                    count={data.length}
                    change={change}
                    unit={metric === "maxWeight" ? "kg" : ""}
                    decimals={metric === "totalVolume" ? 0 : 1}
                />
            )}

            <View style={styles.chartContainer}>
                <LineChart values={values} labels={labels} />
            </View>
        </>
    );
}

// ── Program view ──────────────────────────────────────────

function ProgramView() {
    const [names, setNames] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [history, setHistory] = useState<ProgramSessionPoint[]>([]);
    const [metric, setMetric] = useState<ProgramMetric>("totalVolume");

    useFocusEffect(
        useCallback(() => {
            const n = loadAllProgramNames();
            setNames(n);
            const target = selected && n.includes(selected) ? selected : n[0] ?? null;
            if (target) { setSelected(target); setHistory(loadProgramHistory(target)); }
        }, [selected])
    );

    function select(name: string) { setSelected(name); setHistory(loadProgramHistory(name)); }

    const values = history.map((h) => h[metric]);
    const dates = history.map((h) => h.date);
    const labels = makeXLabels(dates);
    const latest = values[values.length - 1] ?? null;
    const first = values[0] ?? null;
    const change = latest !== null && first !== null && values.length > 1
        ? ((latest - first) / (first || 1)) * 100 : null;

    // Per-exercise breakdown for the most recent session
    const latestBreakdown = history[history.length - 1]?.exerciseBreakdown ?? [];

    if (names.length === 0) return <EmptyState />;

    return (
        <>
            <Picker names={names} selected={selected} onSelect={select} />

            <MetricToggle
                options={[
                    { key: "totalVolume", label: "Total Volume" },
                    { key: "maxWeight", label: "Peak Weight" },
                ]}
                active={metric}
                onChange={(k) => setMetric(k as ProgramMetric)}
            />

            {history.length > 0 && (
                <StatsRow
                    latest={latest}
                    count={history.length}
                    change={change}
                    unit={metric === "maxWeight" ? "kg" : ""}
                    decimals={metric === "totalVolume" ? 0 : 1}
                />
            )}

            <View style={styles.chartContainer}>
                <LineChart values={values} labels={labels} />
            </View>

            {/* Latest session breakdown */}
            {latestBreakdown.length > 0 && (
                <View style={styles.breakdownContainer}>
                    <Text style={styles.breakdownTitle}>Last session — exercise breakdown</Text>
                    {latestBreakdown.map((ex) => (
                        <View key={ex.name} style={styles.breakdownRow}>
                            <Text style={styles.breakdownName}>{ex.name}</Text>
                            <Text style={styles.breakdownStat}>{ex.maxWeight}kg</Text>
                            <Text style={styles.breakdownVolume}>{ex.totalVolume.toFixed(0)} vol</Text>
                        </View>
                    ))}
                </View>
            )}
        </>
    );
}

// ── Shared sub-components ─────────────────────────────────

function EmptyState() {
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Complete sessions to track your progress</Text>
        </View>
    );
}

function Picker({ names, selected, onSelect }: { names: string[]; selected: string | null; onSelect: (n: string) => void }) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.picker}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        >
            {names.map((name) => (
                <TouchableOpacity
                    key={name}
                    style={[styles.chip, selected === name && styles.chipActive]}
                    onPress={() => onSelect(name)}
                >
                    <Text style={[styles.chipText, selected === name && styles.chipTextActive]}>{name}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

function MetricToggle({ options, active, onChange }: {
    options: { key: string; label: string }[];
    active: string;
    onChange: (k: string) => void;
}) {
    return (
        <View style={styles.metricToggle}>
            {options.map((o) => (
                <TouchableOpacity
                    key={o.key}
                    style={[styles.metricBtn, active === o.key && styles.metricBtnActive]}
                    onPress={() => onChange(o.key)}
                >
                    <Text style={[styles.metricText, active === o.key && styles.metricTextActive]}>
                        {o.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

function StatsRow({ latest, count, change, unit, decimals }: {
    latest: number | null;
    count: number;
    change: number | null;
    unit: string;
    decimals: number;
}) {
    return (
        <View style={styles.statsRow}>
            <View style={styles.statBox}>
                <Text style={styles.statValue}>
                    {latest?.toFixed(decimals)}{unit}
                </Text>
                <Text style={styles.statLabel}>Current</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statValue}>{count}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
            </View>
            {change !== null && (
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: change >= 0 ? "#4fdb6f" : "#ff6b6b" }]}>
                        {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                    </Text>
                    <Text style={styles.statLabel}>Change</Text>
                </View>
            )}
        </View>
    );
}

// ── Root screen ───────────────────────────────────────────

export default function ProgressScreen() {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<ViewMode>("exercise");

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <Text style={styles.title}>Progress</Text>
                </View>

                {/* Mode toggle */}
                <View style={styles.modeToggle}>
                    <TouchableOpacity
                        style={[styles.modeBtn, mode === "exercise" && styles.modeBtnActive]}
                        onPress={() => setMode("exercise")}
                    >
                        <Text style={[styles.modeBtnText, mode === "exercise" && styles.modeBtnTextActive]}>
                            By Exercise
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeBtn, mode === "program" && styles.modeBtnActive]}
                        onPress={() => setMode("program")}
                    >
                        <Text style={[styles.modeBtnText, mode === "program" && styles.modeBtnTextActive]}>
                            By Program
                        </Text>
                    </TouchableOpacity>
                </View>

                {mode === "exercise" ? <ExerciseView /> : <ProgramView />}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f0f" },
    header: { paddingHorizontal: 20, paddingBottom: 12 },
    title: { fontSize: 28, fontWeight: "800", color: "#fff" },

    modeToggle: { flexDirection: "row", marginHorizontal: 20, marginBottom: 20, backgroundColor: "#1a1a1a", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#2a2a2a" },
    modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
    modeBtnActive: { backgroundColor: "#e0ff4f" },
    modeBtnText: { color: "#555", fontWeight: "700", fontSize: 14 },
    modeBtnTextActive: { color: "#0f0f0f" },

    empty: { justifyContent: "center", alignItems: "center", padding: 40, marginTop: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: "#666", textAlign: "center" },

    picker: { marginBottom: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a" },
    chipActive: { backgroundColor: "#e0ff4f", borderColor: "#e0ff4f" },
    chipText: { color: "#888", fontWeight: "600", fontSize: 13 },
    chipTextActive: { color: "#0f0f0f" },

    metricToggle: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: "#1a1a1a", borderRadius: 10, padding: 4 },
    metricBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    metricBtnActive: { backgroundColor: "#2a2a2a" },
    metricText: { color: "#555", fontWeight: "600", fontSize: 13 },
    metricTextActive: { color: "#e0ff4f" },

    statsRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, gap: 10 },
    statBox: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 10, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#2a2a2a" },
    statValue: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 4 },
    statLabel: { fontSize: 11, color: "#555", textTransform: "uppercase", fontWeight: "600" },

    chartContainer: { marginHorizontal: 20, backgroundColor: "#141414", borderRadius: 14, padding: 16, marginBottom: 20 },

    breakdownContainer: { marginHorizontal: 20, backgroundColor: "#1a1a1a", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#2a2a2a" },
    breakdownTitle: { color: "#555", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
    breakdownRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#222" },
    breakdownName: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600" },
    breakdownStat: { color: "#e0ff4f", fontSize: 14, fontWeight: "700", marginRight: 12 },
    breakdownVolume: { color: "#555", fontSize: 12 },
});