import React, { createContext, useContext, useState, useEffect } from "react";
import { darkColors, lightColors, ThemeColors } from "./theme";
import { getSetting, setSetting } from "../db/database";

type ThemeContextValue = {
    isDark: boolean;
    colors: ThemeColors;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
    isDark: true,
    colors: darkColors,
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const saved = getSetting("theme");
        if (saved === "light") setIsDark(false);
        if (saved === "dark") setIsDark(true);
    }, []);

    function toggleTheme() {
        setIsDark((prev) => {
            const next = !prev;
            setSetting("theme", next ? "dark" : "light");
            return next;
        });
    }

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}