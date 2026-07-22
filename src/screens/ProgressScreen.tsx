import React, { useCallback, useState, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
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
    loadWeightEntries,
    getTodayWeightEntry,
    saveTodayWeightEntry,
    deleteWeightEntry,
    WeightEntry,
} from "../db/database";
import { useTheme } from "../theme/ThemeContext";
import { useUnit } from "../theme/UnitContext";
import { ThemeColors } from "../theme/theme";

const Y_AXIS_W = 44;
const CHART_H = 160;
const DOT_R = 5;

type ExerciseMetric = "maxWeight" | "totalVolume";
type ProgramMetric = "maxWeight" | "totalVolume";
type ViewMode = "exercise" | "program" | "bodyweight";

// ── Helpers ───────────────────────────────────────────────

function shortDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function makeXLabels(dates: string[]): string[] {
    const dayStrings = dates.map((d) => shortDate(d));
    const hasDuplicates = new Set(dayStrings).size < dayStrings.length;
    if (hasDuplicates) {
        return dates.map((_, i) => `S${i + 1}`);
    }
    return dayStrings;
}

// ── Shared line chart (pure RN views) ─────────────────────

function LineChart({ values, labels, unit = "", decimals = 1 }: {
    values: number[]; labels: string[]; unit?: string; decimals?: number;
}) {
    const { colors: c } = useTheme();
    const chartStyles = getChartStyles(c);
    const [chartW, setChartW] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);

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

    const sel = selected !== null ? pts[selected] : null;
    // Clamp tooltip horizontally so it doesn't overflow the chart edges
    const tooltipW = 110;
    const tooltipLeft = sel
        ? Math.min(Math.max(sel.x - tooltipW / 2, 0), Math.max(chartW - tooltipW, 0))
        : 0;

    return (
        <View style={chartStyles.container}>
            <View style={chartStyles.plotRow}>
                <View style={chartStyles.yAxis}>
                    <Text style={chartStyles.yLabel}>{max.toFixed(0)}</Text>
                    <Text style={chartStyles.yLabel}>{((max + min) / 2).toFixed(0)}</Text>
                    <Text style={chartStyles.yLabel}>{min.toFixed(0)}</Text>
                </View>

                <View
                    style={{ flex: 1, height: CHART_H }}
                    onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
                >
                    <View style={{ overflow: "hidden", height: CHART_H }}>
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
                                    backgroundColor: c.accent,
                                    transformOrigin: "left center",
                                    transform: [{ rotate: `${seg.angle}deg` }],
                                }}
                            />
                        ))}

                        {pts.map((p, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => setSelected(selected === i ? null : i)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={[
                                    chartStyles.dot,
                                    { left: p.x - DOT_R, top: p.y - DOT_R },
                                    selected === i && chartStyles.dotSelected,
                                ]}
                            />
                        ))}
                    </View>

                    {sel && selected !== null && (
                        <View
                            style={[
                                chartStyles.tooltip,
                                { left: tooltipLeft, top: Math.max(sel.y - 46, 0), width: tooltipW },
                            ]}
                        >
                            <Text style={chartStyles.tooltipDate}>{labels[selected]}</Text>
                            <Text style={chartStyles.tooltipValue}>
                                {values[selected].toFixed(decimals)}{unit}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

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

const getChartStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flexDirection: "column", marginVertical: 8 },
    plotRow: { flexDirection: "row" },
    xLabelsRow: { flexDirection: "row", marginTop: 6 },
    placeholder: { height: CHART_H, justifyContent: "center", alignItems: "center", backgroundColor: c.input, borderRadius: 8, width: "100%" },
    placeholderText: { color: c.textFaint, fontSize: 13 },
    yAxis: { width: Y_AXIS_W, height: CHART_H, justifyContent: "space-between", alignItems: "flex-end", paddingRight: 6 },
    yLabel: { color: c.textFaint, fontSize: 10 },
    gridLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: c.divider },
    dot: { position: "absolute", width: DOT_R * 2, height: DOT_R * 2, borderRadius: DOT_R, backgroundColor: c.accent },
    dotSelected: { borderWidth: 3, borderColor: c.text },
    tooltip: {
        position: "absolute",
        backgroundColor: c.text,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: "center",
    },
    tooltipDate: { color: c.bg, fontSize: 10, fontWeight: "600", opacity: 0.7 },
    tooltipValue: { color: c.bg, fontSize: 14, fontWeight: "800" },
    xLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    xLabel: { color: c.textFaint, fontSize: 11 },
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
    const { colors } = useTheme();
    const { unit, kgToDisplay } = useUnit();
    const styles = getStyles(colors);
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

    // processExerciseHistory returns raw kg values; convert to display unit here
    const data = useMemo(() => processExerciseHistory(history), [history]);
    const scale = kgToDisplay(1); // linear conversion factor
    const values = data.map((d) => metric === "maxWeight" ? kgToDisplay(d[metric]) : d[metric] * scale);
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
                    unit={metric === "maxWeight" ? unit : ""}
                    decimals={metric === "totalVolume" ? 0 : 1}
                />
            )}

            <View style={styles.chartContainer}>
                <LineChart values={values} labels={labels} unit={metric === "maxWeight" ? unit : ""} decimals={metric === "totalVolume" ? 0 : 1} />
            </View>
        </>
    );
}

// ── Program view ──────────────────────────────────────────

function ProgramView() {
    const { colors } = useTheme();
    const { unit, kgToDisplay } = useUnit();
    const styles = getStyles(colors);
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

    const scale = kgToDisplay(1);
    const values = history.map((h) => metric === "maxWeight" ? kgToDisplay(h[metric]) : h[metric] * scale);
    const dates = history.map((h) => h.date);
    const labels = makeXLabels(dates);
    const latest = values[values.length - 1] ?? null;
    const first = values[0] ?? null;
    const change = latest !== null && first !== null && values.length > 1
        ? ((latest - first) / (first || 1)) * 100 : null;

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
                    unit={metric === "maxWeight" ? unit : ""}
                    decimals={metric === "totalVolume" ? 0 : 1}
                />
            )}

            <View style={styles.chartContainer}>
                <LineChart values={values} labels={labels} unit={metric === "maxWeight" ? unit : ""} decimals={metric === "totalVolume" ? 0 : 1} />
            </View>

            {latestBreakdown.length > 0 && (
                <View style={styles.breakdownContainer}>
                    <Text style={styles.breakdownTitle}>Last session — exercise breakdown</Text>
                    {latestBreakdown.map((ex) => (
                        <View key={ex.name} style={styles.breakdownRow}>
                            <Text style={styles.breakdownName}>{ex.name}</Text>
                            <Text style={styles.breakdownStat}>{kgToDisplay(ex.maxWeight).toFixed(1)}{unit}</Text>
                            <Text style={styles.breakdownVolume}>{(ex.totalVolume * scale).toFixed(0)} vol</Text>
                        </View>
                    ))}
                </View>
            )}
        </>
    );
}

// ── Body Weight view ──────────────────────────────────────

function movingAverage(values: number[], windowSize: number): number[] {
    return values.map((_, i) => {
        const start = Math.max(0, i - windowSize + 1);
        const slice = values.slice(start, i + 1);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
}

// Groups entries into calendar weeks (Monday start) and averages each week.
type WeeklyPoint = { weekStart: string; mean: number; count: number };

function getWeekStart(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay(); // 0=Sun..6=Sat
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diffToMonday);
    return d.toISOString().slice(0, 10);
}

function aggregateWeekly(entries: { date: string; weight: number }[]): WeeklyPoint[] {
    const map = new Map<string, number[]>();
    for (const e of entries) {
        const wk = getWeekStart(e.date);
        if (!map.has(wk)) map.set(wk, []);
        map.get(wk)!.push(e.weight);
    }
    return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([weekStart, weights]) => ({
            weekStart,
            mean: weights.reduce((a, b) => a + b, 0) / weights.length,
            count: weights.length,
        }));
}

function BodyWeightView() {
    const { colors } = useTheme();
    const { unit, kgToDisplay, displayToKg } = useUnit();
    const styles = getStyles(colors);
    const [entries, setEntries] = useState<WeightEntry[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [todayEntry, setTodayEntry] = useState<WeightEntry | null>(null);
    const [granularity, setGranularity] = useState<"daily" | "weekly">("daily");

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [])
    );

    function refresh() {
        const all = loadWeightEntries();
        setEntries(all);
        const today = getTodayWeightEntry();
        setTodayEntry(today);
        setInputValue(today ? String(round2(kgToDisplay(today.weight))) : "");
    }

    function round2(n: number) {
        return Math.round(n * 100) / 100;
    }

    function handleInputChange(text: string) {
        const cleaned = text.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 2) return; // max 2 decimal places
        setInputValue(cleaned);
    }

    function handleSave() {
        const v = parseFloat(inputValue);
        if (isNaN(v) || v <= 0) return;
        const kg = displayToKg(v);
        saveTodayWeightEntry(kg);
        refresh();
    }

    function handleDeleteToday() {
        if (!todayEntry) return;
        Alert.alert(
            "Delete Today's Entry",
            "Remove today's weight entry?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteWeightEntry(todayEntry.date);
                        refresh();
                    },
                },
            ]
        );
    }

    const displayValues = entries.map((e) => kgToDisplay(e.weight));
    const avgWindow = displayValues.length >= 7 ? 7 : displayValues.length;
    const avgValues = avgWindow > 1 ? movingAverage(displayValues, avgWindow) : displayValues;
    const dates = entries.map((e) => e.date);
    const labels = makeXLabels(dates);

    // Mean of the most recent 7 raw weigh-ins (not the smoothed chart line)
    const last7 = displayValues.slice(-7);
    const mean7 = last7.length > 0
        ? last7.reduce((a, b) => a + b, 0) / last7.length
        : null;

    // "Current" is today's/most recent actual entry — NOT the smoothed average,
    // which for the last point would be mathematically identical to mean7.
    const latestRaw = displayValues[displayValues.length - 1] ?? null;
    const firstAvg = avgValues[0] ?? null;
    const lastAvg = avgValues[avgValues.length - 1] ?? null;
    const change = lastAvg !== null && firstAvg !== null && avgValues.length > 1
        ? ((lastAvg - firstAvg) / (firstAvg || 1)) * 100 : null;

    const weeklyPoints = useMemo(() => {
        const zipped = entries.map((e) => ({ date: e.date, weight: kgToDisplay(e.weight) }));
        return aggregateWeekly(zipped);
    }, [entries, unit]);

    const thisWeekMean = weeklyPoints[weeklyPoints.length - 1]?.mean ?? null;
    const lastWeekMean = weeklyPoints[weeklyPoints.length - 2]?.mean ?? null;
    const weekDelta = thisWeekMean !== null && lastWeekMean !== null
        ? thisWeekMean - lastWeekMean : null;
    const weekDeltaPct = weekDelta !== null && lastWeekMean
        ? (weekDelta / lastWeekMean) * 100 : null;

    const chartValues = granularity === "weekly" ? weeklyPoints.map((w) => w.mean) : avgValues;
    const chartDates = granularity === "weekly" ? weeklyPoints.map((w) => w.weekStart) : dates;
    const chartLabels = makeXLabels(chartDates);

    if (entries.length === 0 && !todayEntry) {
        return (
            <>
                <WeightEntryBox
                    value={inputValue}
                    unit={unit}
                    isEditing={!!todayEntry}
                    onChange={handleInputChange}
                    onSave={handleSave}
                    onDelete={handleDeleteToday}
                />
                <EmptyState />
            </>
        );
    }

    return (
        <>
            <WeightEntryBox
                value={inputValue}
                unit={unit}
                isEditing={!!todayEntry}
                onChange={handleInputChange}
                onSave={handleSave}
                onDelete={handleDeleteToday}
            />

            {entries.length > 0 && (
                <StatsRow
                    latest={latestRaw}
                    count={entries.length}
                    change={change}
                    unit={unit}
                    decimals={2}
                    middleLabel="7-Day Avg"
                    middleValue={mean7 !== null ? `${mean7.toFixed(2)}${unit}` : "—"}
                />
            )}

            {weeklyPoints.length >= 2 && (
                <View style={styles.weekCompareCard}>
                    <View style={styles.weekCompareBox}>
                        <Text style={styles.weekCompareLabel}>Last Week</Text>
                        <Text style={styles.weekCompareValue}>
                            {lastWeekMean !== null ? `${lastWeekMean.toFixed(2)}${unit}` : "—"}
                        </Text>
                    </View>
                    <Text style={styles.weekCompareArrow}>→</Text>
                    <View style={styles.weekCompareBox}>
                        <Text style={styles.weekCompareLabel}>This Week</Text>
                        <Text style={styles.weekCompareValue}>
                            {thisWeekMean !== null ? `${thisWeekMean.toFixed(2)}${unit}` : "—"}
                        </Text>
                    </View>
                    {weekDeltaPct !== null && weekDelta !== null && (
                        <View style={styles.weekCompareBox}>
                            <Text style={styles.weekCompareLabel}>Change</Text>
                            <Text style={[
                                styles.weekCompareValue,
                                { color: weekDelta >= 0 ? "#4fdb6f" : "#ff6b6b" },
                            ]}>
                                {weekDelta >= 0 ? "+" : ""}{weekDelta.toFixed(2)}{unit}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {entries.length >= 2 && (
                <MetricToggle
                    options={[
                        { key: "daily", label: "Daily" },
                        { key: "weekly", label: "Weekly" },
                    ]}
                    active={granularity}
                    onChange={(k) => setGranularity(k as "daily" | "weekly")}
                />
            )}

            <View style={styles.chartContainer}>
                {entries.length >= 2 ? (
                    <LineChart values={chartValues} labels={chartLabels} unit={unit} decimals={2} />
                ) : (
                    <View style={{ padding: 20, alignItems: "center" }}>
                        <Text style={{ color: colors.textFaint, fontSize: 13 }}>
                            Log at least 2 days to see a trend
                        </Text>
                    </View>
                )}
            </View>

            {granularity === "daily" && avgWindow > 1 && (
                <Text style={styles.hint}>
                    Chart shows a {avgWindow}-day moving average to smooth out daily fluctuations.
                </Text>
            )}
            {granularity === "weekly" && (
                <Text style={styles.hint}>
                    Each point is the average weight for that calendar week (Mon–Sun).
                </Text>
            )}
        </>
    );
}

function WeightEntryBox({ value, unit, isEditing, onChange, onSave, onDelete }: {
    value: string; unit: string; isEditing: boolean;
    onChange: (t: string) => void; onSave: () => void; onDelete: () => void;
}) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    return (
        <View style={styles.entryBox}>
            <Text style={styles.entryLabel}>
                {isEditing ? "Edit Today's Entry" : "Log Today's Weight"}
            </Text>
            <View style={styles.entryRow}>
                <TextInput
                    style={styles.entryInput}
                    placeholder={`0.0 ${unit}`}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    value={value}
                    onChangeText={onChange}
                    onSubmitEditing={onSave}
                    returnKeyType="done"
                />
                <Text style={styles.entryUnit}>{unit}</Text>
                <TouchableOpacity style={styles.entrySaveBtn} onPress={onSave}>
                    <Text style={styles.entrySaveBtnText}>{isEditing ? "Update" : "Save"}</Text>
                </TouchableOpacity>
                {isEditing && (
                    <TouchableOpacity style={styles.entryDeleteBtn} onPress={onDelete}>
                        <Text style={styles.entryDeleteBtnText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ── Shared sub-components ─────────────────────────────────

function EmptyState() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Complete sessions to track your progress</Text>
        </View>
    );
}

function Picker({ names, selected, onSelect }: { names: string[]; selected: string | null; onSelect: (n: string) => void }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
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
    const { colors } = useTheme();
    const styles = getStyles(colors);
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

function StatsRow({ latest, count, change, unit, decimals, middleLabel, middleValue }: {
    latest: number | null;
    count: number;
    change: number | null;
    unit: string;
    decimals: number;
    middleLabel?: string;
    middleValue?: string;
}) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    return (
        <View style={styles.statsRow}>
            <View style={styles.statBox}>
                <Text style={styles.statValue}>
                    {latest?.toFixed(decimals)}{unit}
                </Text>
                <Text style={styles.statLabel}>Current</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statValue}>{middleValue ?? count}</Text>
                <Text style={styles.statLabel}>{middleLabel ?? "Sessions"}</Text>
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
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [mode, setMode] = useState<ViewMode>("exercise");

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <Text style={styles.title}>Progress</Text>
                </View>

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
                    <TouchableOpacity
                        style={[styles.modeBtn, mode === "bodyweight" && styles.modeBtnActive]}
                        onPress={() => setMode("bodyweight")}
                    >
                        <Text style={[styles.modeBtnText, mode === "bodyweight" && styles.modeBtnTextActive]}>
                            Body Weight
                        </Text>
                    </TouchableOpacity>
                </View>

                {mode === "exercise" ? <ExerciseView /> : mode === "program" ? <ProgramView /> : <BodyWeightView />}
            </ScrollView>
        </View>
    );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: 20, paddingBottom: 12 },
    title: { fontSize: 28, fontWeight: "800", color: c.text },

    modeToggle: { flexDirection: "row", marginHorizontal: 20, marginBottom: 20, backgroundColor: c.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.cardBorder },
    modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
    modeBtnActive: { backgroundColor: c.accent },
    modeBtnText: { color: c.textFaint, fontWeight: "700", fontSize: 14 },
    modeBtnTextActive: { color: c.accentText },

    empty: { justifyContent: "center", alignItems: "center", padding: 40, marginTop: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: c.text, marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: c.textDim, textAlign: "center" },

    picker: { marginBottom: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { color: c.textDim, fontWeight: "600", fontSize: 13 },
    chipTextActive: { color: c.accentText },

    metricToggle: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: c.card, borderRadius: 10, padding: 4 },
    metricBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    metricBtnActive: { backgroundColor: c.cardBorder },
    metricText: { color: c.textFaint, fontWeight: "600", fontSize: 13 },
    metricTextActive: { color: c.accent },

    statsRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, gap: 10 },
    statBox: { flex: 1, backgroundColor: c.card, borderRadius: 10, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.cardBorder },
    statValue: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 4 },
    statLabel: { fontSize: 11, color: c.textFaint, textTransform: "uppercase", fontWeight: "600" },

    chartContainer: { marginHorizontal: 20, backgroundColor: c.input, borderRadius: 14, padding: 16, marginBottom: 20 },

    breakdownContainer: { marginHorizontal: 20, backgroundColor: c.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.cardBorder },
    breakdownTitle: { color: c.textFaint, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
    breakdownRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.divider },
    breakdownName: { flex: 1, color: c.text, fontSize: 14, fontWeight: "600" },
    breakdownStat: { color: c.accent, fontSize: 14, fontWeight: "700", marginRight: 12 },
    breakdownVolume: { color: c.textFaint, fontSize: 12 },

    entryBox: { marginHorizontal: 20, marginBottom: 16, backgroundColor: c.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.cardBorder },
    entryLabel: { color: c.textDim, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
    entryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    entryInput: { flex: 1, backgroundColor: c.input, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, color: c.text, fontSize: 16 },
    entryUnit: { color: c.textFaint, fontSize: 14, fontWeight: "600" },
    entrySaveBtn: { backgroundColor: c.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    entrySaveBtnText: { color: c.accentText, fontWeight: "700", fontSize: 14 },
    entryDeleteBtn: { padding: 8 },
    entryDeleteBtnText: { color: c.danger, fontSize: 16, fontWeight: "700" },
    hint: { fontSize: 12, color: c.textFaint, paddingHorizontal: 20, marginTop: -8, marginBottom: 20, lineHeight: 18 },

    weekCompareCard: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: c.card,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: c.cardBorder,
        gap: 8,
    },
    weekCompareBox: { flex: 1, alignItems: "center" },
    weekCompareLabel: { fontSize: 10, color: c.textFaint, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
    weekCompareValue: { fontSize: 16, fontWeight: "800", color: c.text },
    weekCompareArrow: { color: c.textFaint, fontSize: 16 },
});