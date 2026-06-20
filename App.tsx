import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "./src/screens/HomeScreen";
import CreateProgramScreen from "./src/screens/CreateProgramScreen";
import SessionScreen from "./src/screens/SessionScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

import { initDB, loadPrograms, saveProgram, deleteProgram, reorderPrograms } from "./src/db/database";
import { Program, Session } from "./src/types";

export type RootStackParamList = {
    Tabs: undefined;
    CreateProgram: { program?: Program };
    Session: { session: Session };
    Settings: undefined;
};

export type TabParamList = {
    Home: undefined;
    History: undefined;
    Progress: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
    const icons: Record<string, string> = { Home: "🏋️", History: "📋", Progress: "📈" };
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[name] ?? "•"}</Text>;
}

function Tabs({ onStartSession, programs, onDeleteProgram, onReorderPrograms }: any) {
    const insets = useSafeAreaInsets();
    return (
        <Tab.Navigator
            tabBarPosition="bottom"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
                tabBarStyle: {
                    backgroundColor: "#0f0f0f",
                    borderTopWidth: 1,
                    borderTopColor: "#222",
                    paddingBottom: insets.bottom + 4,
                    height: 64 + insets.bottom,
                },
                tabBarActiveTintColor: "#e0ff4f",
                tabBarInactiveTintColor: "#555",
                tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
                tabBarIndicatorStyle: { backgroundColor: "transparent" },
                tabBarShowIcon: true,
                swipeEnabled: true,
            })}
        >
            <Tab.Screen name="Home">
                {(props) => (
                    <HomeScreen
                        {...props}
                        programs={programs}
                        onStartSession={onStartSession}
                        onDeleteProgram={onDeleteProgram}
                        onReorderPrograms={onReorderPrograms}
                    />
                )}
            </Tab.Screen>
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Progress" component={ProgressScreen} />
        </Tab.Navigator>
    );
}

export default function App() {
    const [programs, setPrograms] = useState<Program[]>([]);

    useEffect(() => {
        initDB();
        setPrograms(loadPrograms());
    }, []);

    function handleSaveProgram(program: Program) {
        saveProgram(program);
        setPrograms(loadPrograms());
    }

    function handleDeleteProgram(programId: string) {
        deleteProgram(programId);
        setPrograms(loadPrograms());
    }

    function handleReorderPrograms(orderedIds: string[]) {
        reorderPrograms(orderedIds);
        setPrograms(loadPrograms());
    }

    function createSession(program: Program): Session {
        return { id: Date.now().toString(), program, date: new Date().toISOString(), exerciseLogs: [] };
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <NavigationContainer>
                    <Stack.Navigator
                        screenOptions={{
                            headerStyle: { backgroundColor: "#0f0f0f" },
                            headerTintColor: "#e0ff4f",
                            headerTitleStyle: { fontWeight: "700" },
                        }}
                    >
                        <Stack.Screen name="Tabs" options={{ headerShown: false }}>
                            {(props) => (
                                <Tabs
                                    {...props}
                                    programs={programs}
                                    onDeleteProgram={handleDeleteProgram}
                                    onReorderPrograms={handleReorderPrograms}
                                    onStartSession={(program: Program) => {
                                        const session = createSession(program);
                                        props.navigation.navigate("Session", { session });
                                    }}
                                />
                            )}
                        </Stack.Screen>

                        <Stack.Screen name="CreateProgram" options={({ route }: any) => ({
                            title: route.params?.program ? "Edit Program" : "New Program",
                        })}>
                            {(props) => (
                                <CreateProgramScreen
                                    {...props}
                                    onSave={(program: Program) => {
                                        handleSaveProgram(program);
                                        props.navigation.goBack();
                                    }}
                                />
                            )}
                        </Stack.Screen>

                        <Stack.Screen name="Session" options={{ title: "Workout", headerBackVisible: false }}>
                            {(props) => <SessionScreen {...props} />}
                        </Stack.Screen>

                        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
                    </Stack.Navigator>
                </NavigationContainer>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}