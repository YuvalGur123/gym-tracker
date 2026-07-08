import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Switch,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import { exportAllData, importAllData, BackupData } from "../db/database";
import { useTheme } from "../theme/ThemeContext";
import { useUnit } from "../theme/UnitContext";
import { ThemeColors } from "../theme/theme";

export default function SettingsScreen(_props: any) {
    const insets = useSafeAreaInsets();
    const { isDark, colors, toggleTheme } = useTheme();
    const { unit, toggleUnit } = useUnit();
    const styles = getStyles(colors);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    async function handleExport() {
        try {
            setExporting(true);
            const data = exportAllData();
            const json = JSON.stringify(data, null, 2);
            const filename = `gym-backup-${new Date().toISOString().slice(0, 10)}.json`;

            if (Platform.OS === "android") {
                // Ask once for a folder (e.g. Downloads) — a native folder picker,
                // not a "share with app" dialog.
                const permissions =
                    await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync();

                if (!permissions.granted) {
                    Alert.alert(
                        "Permission Needed",
                        "Choose a folder (e.g. Downloads) to save your backup."
                    );
                    return;
                }

                const fileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    filename,
                    "application/json"
                );
                await FileSystemLegacy.writeAsStringAsync(fileUri, json, {
                    encoding: FileSystemLegacy.EncodingType.UTF8,
                });

                Alert.alert(
                    "Backup Saved ✓",
                    `Your data has been saved as:\n\n${filename}`
                );
            } else {
                // iOS has no public Downloads folder — save to app storage,
                // accessible via the Files app under "On My iPhone".
                const file = new File(Paths.document, filename);
                file.write(json);

                Alert.alert(
                    "Backup Saved ✓",
                    `Your data has been saved to the app's Files location as:\n\n${filename}\n\nYou can find it in the Files app.`
                );
            }
        } catch (e) {
            Alert.alert("Export Failed", "Something went wrong while exporting your data.");
            console.error(e);
        } finally {
            setExporting(false);
        }
    }

    async function handleImport() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "application/json",
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            setImporting(true);
            const uri = result.assets[0].uri;

            // Read using new File API
            const file = new File(uri);
            const json = await file.text();

            const backup: BackupData = JSON.parse(json);

            if (!backup.version || !backup.programs || !backup.sessions) {
                Alert.alert("Invalid File", "This doesn't look like a valid gym backup file.");
                setImporting(false);
                return;
            }

            Alert.alert(
                "Restore Backup",
                `This will replace ALL current data with the backup from ${backup.exportedAt?.slice(0, 10) ?? "unknown date"}.\n\nThis cannot be undone. Continue?`,
                [
                    { text: "Cancel", style: "cancel", onPress: () => setImporting(false) },
                    {
                        text: "Restore",
                        style: "destructive",
                        onPress: () => {
                            try {
                                importAllData(backup);
                                Alert.alert(
                                    "Restored ✓",
                                    "Your data has been restored. Please restart the app for changes to take full effect.",
                                );
                            } catch (e) {
                                Alert.alert("Import Failed", "The backup file may be corrupted.");
                                console.error(e);
                            } finally {
                                setImporting(false);
                            }
                        },
                    },
                ]
            );
        } catch (e) {
            Alert.alert("Import Failed", "Could not read the selected file.");
            console.error(e);
            setImporting(false);
        }
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
            {/* Appearance */}
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.section}>
                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <Text style={styles.rowIcon}>🌙</Text>
                        <View>
                            <Text style={styles.rowLabel}>Dark Mode</Text>
                            <Text style={styles.rowSub}>{isDark ? "On" : "Off"}</Text>
                        </View>
                    </View>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: colors.cardBorder, true: colors.accent }}
                        thumbColor="#ffffff"
                    />
                </View>
            </View>

            {/* Units */}
            <Text style={styles.sectionTitle}>Units</Text>
            <View style={styles.section}>
                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <Text style={styles.rowIcon}>⚖️</Text>
                        <View>
                            <Text style={styles.rowLabel}>Weight Unit</Text>
                            <Text style={styles.rowSub}>Used across the app</Text>
                        </View>
                    </View>
                    <View style={styles.langToggle}>
                        <TouchableOpacity
                            style={[styles.langOption, unit === "kg" && styles.langOptionActive]}
                            onPress={() => { if (unit !== "kg") toggleUnit(); }}
                        >
                            <Text style={unit === "kg" ? styles.langOptionTextActive : styles.langOptionText}>kg</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.langOption, unit === "lb" && styles.langOptionActive]}
                            onPress={() => { if (unit !== "lb") toggleUnit(); }}
                        >
                            <Text style={unit === "lb" ? styles.langOptionTextActive : styles.langOptionText}>lb</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Language */}
            <Text style={styles.sectionTitle}>Language</Text>
            <View style={styles.section}>
                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <Text style={styles.rowIcon}>🌐</Text>
                        <View>
                            <Text style={styles.rowLabel}>Language</Text>
                            <Text style={styles.rowSub}>Coming soon</Text>
                        </View>
                    </View>
                    <View style={styles.langToggle}>
                        <View style={[styles.langOption, styles.langOptionActive]}>
                            <Text style={styles.langOptionTextActive}>EN</Text>
                        </View>
                        <View style={styles.langOption}>
                            <Text style={styles.langOptionText}>עב</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Data */}
            <Text style={styles.sectionTitle}>Data</Text>
            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.row, exporting && styles.rowDisabled]}
                    onPress={handleExport}
                    disabled={exporting}
                >
                    <View style={styles.rowLeft}>
                        <Text style={styles.rowIcon}>📤</Text>
                        <View>
                            <Text style={styles.rowLabel}>Export Data</Text>
                            <Text style={styles.rowSub}>Save a backup of all your data</Text>
                        </View>
                    </View>
                    {exporting
                        ? <ActivityIndicator color={colors.accent} />
                        : <Text style={styles.chevron}>›</Text>
                    }
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={[styles.row, importing && styles.rowDisabled]}
                    onPress={handleImport}
                    disabled={importing}
                >
                    <View style={styles.rowLeft}>
                        <Text style={styles.rowIcon}>📥</Text>
                        <View>
                            <Text style={styles.rowLabel}>Import Data</Text>
                            <Text style={styles.rowSub}>Restore from a backup file</Text>
                        </View>
                    </View>
                    {importing
                        ? <ActivityIndicator color={colors.accent} />
                        : <Text style={styles.chevron}>›</Text>
                    }
                </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
                Export saves a .json backup file to a folder you choose (e.g. Downloads). Import restores from that file — pick it on your new phone to transfer everything over.
            </Text>
        </ScrollView>
    );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: c.textFaint,
        textTransform: "uppercase",
        letterSpacing: 1,
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 8,
    },
    section: {
        backgroundColor: c.card,
        marginHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.cardBorder,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rowDisabled: { opacity: 0.5 },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
    rowIcon: { fontSize: 22 },
    rowLabel: { fontSize: 16, color: c.text, fontWeight: "500" },
    rowSub: { fontSize: 12, color: c.textFaint, marginTop: 2 },
    chevron: { fontSize: 22, color: c.textFaint },
    divider: { height: 1, backgroundColor: c.cardBorder, marginHorizontal: 16 },
    langToggle: {
        flexDirection: "row",
        backgroundColor: c.input,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.cardBorder,
        overflow: "hidden",
    },
    langOption: { paddingHorizontal: 12, paddingVertical: 6 },
    langOptionActive: { backgroundColor: c.accent },
    langOptionText: { color: c.textFaint, fontWeight: "700", fontSize: 13 },
    langOptionTextActive: { color: c.accentText, fontWeight: "700", fontSize: 13 },
    hint: {
        fontSize: 12,
        color: c.textFaint,
        paddingHorizontal: 20,
        paddingTop: 12,
        lineHeight: 18,
    },
});