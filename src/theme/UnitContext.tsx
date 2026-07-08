import React, { createContext, useContext, useState, useEffect } from "react";
import { getSetting, setSetting } from "../db/database";

export type WeightUnit = "kg" | "lb";

type UnitContextValue = {
    unit: WeightUnit;
    toggleUnit: () => void;
    kgToDisplay: (kg: number) => number;
    displayToKg: (value: number) => number;
    unitLabel: string;
};

const KG_PER_LB = 0.453592;

const UnitContext = createContext<UnitContextValue>({
    unit: "kg",
    toggleUnit: () => { },
    kgToDisplay: (kg) => kg,
    displayToKg: (v) => v,
    unitLabel: "kg",
});

export function UnitProvider({ children }: { children: React.ReactNode }) {
    const [unit, setUnit] = useState<WeightUnit>("kg");

    useEffect(() => {
        const saved = getSetting("weightUnit");
        if (saved === "lb" || saved === "kg") setUnit(saved);
    }, []);

    function toggleUnit() {
        setUnit((prev) => {
            const next = prev === "kg" ? "lb" : "kg";
            setSetting("weightUnit", next);
            return next;
        });
    }

    function kgToDisplay(kg: number): number {
        return unit === "lb" ? kg / KG_PER_LB : kg;
    }

    function displayToKg(value: number): number {
        return unit === "lb" ? value * KG_PER_LB : value;
    }

    return (
        <UnitContext.Provider value={{ unit, toggleUnit, kgToDisplay, displayToKg, unitLabel: unit }}>
            {children}
        </UnitContext.Provider>
    );
}

export function useUnit() {
    return useContext(UnitContext);
}