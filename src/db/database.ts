import * as SQLite from "expo-sqlite";
import { Program, Exercise, Session } from "../types";

const db = SQLite.openDatabaseSync("gym.db");

export default db;

export function initDB() {
    db.execSync(`
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY NOT NULL,
      programId TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      programName TEXT,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS exercise_logs (
      id TEXT PRIMARY KEY NOT NULL,
      sessionId TEXT,
      exerciseName TEXT
    );

    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY NOT NULL,
      exerciseLogId TEXT,
      weight REAL,
      reps INTEGER
    );
  `);

    // Add sort_order columns if upgrading from older schema
    try { db.execSync(`ALTER TABLE programs ADD COLUMN sort_order INTEGER DEFAULT 0;`); } catch { }
    try { db.execSync(`ALTER TABLE exercises ADD COLUMN sort_order INTEGER DEFAULT 0;`); } catch { }

    // Backfill sort_order from rowid for existing rows
    db.execSync(`UPDATE programs SET sort_order = rowid WHERE sort_order = 0;`);
    db.execSync(`UPDATE exercises SET sort_order = rowid WHERE sort_order = 0;`);

    // Migration: fix rows where exerciseName was accidentally saved as the exercise ID
    db.execSync(`
      UPDATE exercise_logs
      SET exerciseName = (
        SELECT e.name FROM exercises e
        WHERE e.id = SUBSTR(exercise_logs.id, INSTR(exercise_logs.id, '-') + 1)
        LIMIT 1
      )
      WHERE exerciseName GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
        AND EXISTS (
          SELECT 1 FROM exercises e
          WHERE e.id = SUBSTR(exercise_logs.id, INSTR(exercise_logs.id, '-') + 1)
        );
    `);
}

// ── Programs ──────────────────────────────────────────────

export function saveProgram(program: Program, sortOrder?: number) {
    const order = sortOrder ?? Date.now();
    db.runSync(
        `INSERT OR REPLACE INTO programs (id, name, sort_order) VALUES (?, ?, ?);`,
        [program.id, program.name, order]
    );
    program.exercises.forEach((ex, i) => {
        db.runSync(
            `INSERT OR REPLACE INTO exercises (id, programId, name, sort_order) VALUES (?, ?, ?, ?);`,
            [ex.id, program.id, ex.name, i]
        );
    });
}

export function loadPrograms(): Program[] {
    const programs = db.getAllSync<{ id: string; name: string }>(
        `SELECT * FROM programs ORDER BY sort_order ASC;`
    );
    return programs.map((p) => {
        const exercises = db.getAllSync<{ id: string; name: string }>(
            `SELECT * FROM exercises WHERE programId = ? ORDER BY sort_order ASC;`,
            [p.id]
        );
        return { ...p, exercises };
    });
}

export function reorderPrograms(orderedIds: string[]) {
    orderedIds.forEach((id, i) => {
        db.runSync(`UPDATE programs SET sort_order = ? WHERE id = ?;`, [i, id]);
    });
}

export function reorderExercises(programId: string, orderedIds: string[]) {
    orderedIds.forEach((id, i) => {
        db.runSync(`UPDATE exercises SET sort_order = ? WHERE id = ? AND programId = ?;`, [i, id, programId]);
    });
}

export function deleteProgram(programId: string) {
    db.runSync(`DELETE FROM exercises WHERE programId = ?;`, [programId]);
    db.runSync(`DELETE FROM programs WHERE id = ?;`, [programId]);
}

// ── Sessions ──────────────────────────────────────────────

export function saveSession(session: Session) {
    db.runSync(
        `INSERT INTO sessions (id, programName, date) VALUES (?, ?, ?);`,
        [session.id, session.program.name, session.date]
    );

    for (const log of session.exerciseLogs) {
        const logId = `${session.id}-${log.exerciseId}`;
        db.runSync(
            `INSERT INTO exercise_logs (id, sessionId, exerciseName) VALUES (?, ?, ?);`,
            [logId, session.id, log.exerciseName]
        );
        for (const set of log.sets) {
            db.runSync(
                `INSERT INTO sets (id, exerciseLogId, weight, reps) VALUES (?, ?, ?, ?);`,
                [`${logId}-${set.id}`, logId, set.weight, set.reps]
            );
        }
    }
}

export type SessionSummary = {
    id: string;
    programName: string;
    date: string;
};

export type SessionDetail = SessionSummary & {
    exercises: { name: string; sets: { weight: number; reps: number }[] }[];
};

export function loadSessionSummaries(): SessionSummary[] {
    return db.getAllSync<SessionSummary>(
        `SELECT * FROM sessions ORDER BY date DESC;`
    );
}

export function loadSessionDetail(sessionId: string): SessionDetail | null {
    const session = db.getFirstSync<SessionSummary>(
        `SELECT * FROM sessions WHERE id = ?;`, [sessionId]
    );
    if (!session) return null;

    const logs = db.getAllSync<{ id: string; exerciseName: string }>(
        `SELECT id, exerciseName FROM exercise_logs WHERE sessionId = ?;`, [sessionId]
    );

    const exercises = logs.map((log) => {
        const sets = db.getAllSync<{ weight: number; reps: number }>(
            `SELECT weight, reps FROM sets WHERE exerciseLogId = ? ORDER BY rowid ASC;`, [log.id]
        );
        return { name: log.exerciseName, sets };
    }).filter((e) => e.sets.length > 0);

    return { ...session, exercises };
}

export type ExerciseHistory = {
    date: string;
    sets: { weight: number; reps: number }[];
};

export function loadExerciseHistory(exerciseName: string): ExerciseHistory[] {
    const logs = db.getAllSync<{ id: string; sessionId: string }>(
        `SELECT el.id, el.sessionId FROM exercise_logs el
         WHERE LOWER(el.exerciseName) = LOWER(?)
         ORDER BY el.id ASC;`,
        [exerciseName]
    );

    const result: ExerciseHistory[] = [];
    for (const log of logs) {
        const session = db.getFirstSync<{ date: string }>(
            `SELECT date FROM sessions WHERE id = ?;`, [log.sessionId]
        );
        const sets = db.getAllSync<{ weight: number; reps: number }>(
            `SELECT weight, reps FROM sets WHERE exerciseLogId = ? ORDER BY rowid ASC;`, [log.id]
        );
        if (session && sets.length > 0) result.push({ date: session.date, sets });
    }
    return result;
}

export function deleteSession(sessionId: string) {
    const logs = db.getAllSync<{ id: string }>(
        `SELECT id FROM exercise_logs WHERE sessionId = ?;`, [sessionId]
    );
    for (const log of logs) {
        db.runSync(`DELETE FROM sets WHERE exerciseLogId = ?;`, [log.id]);
    }
    db.runSync(`DELETE FROM exercise_logs WHERE sessionId = ?;`, [sessionId]);
    db.runSync(`DELETE FROM sessions WHERE id = ?;`, [sessionId]);
}

export function loadAllExerciseNames(): string[] {
    const rows = db.getAllSync<{ exerciseName: string }>(
        `SELECT DISTINCT exerciseName FROM exercise_logs ORDER BY exerciseName ASC;`
    );
    return rows.map((r) => r.exerciseName);
}

export function loadAllProgramNames(): string[] {
    const rows = db.getAllSync<{ programName: string }>(
        `SELECT DISTINCT programName FROM sessions ORDER BY programName ASC;`
    );
    return rows.map((r) => r.programName);
}

export type ProgramSessionPoint = {
    date: string;
    totalVolume: number;
    maxWeight: number;
    exerciseBreakdown: { name: string; maxWeight: number; totalVolume: number }[];
};

export function loadProgramHistory(programName: string): ProgramSessionPoint[] {
    const sessions = db.getAllSync<{ id: string; date: string }>(
        `SELECT id, date FROM sessions WHERE LOWER(programName) = LOWER(?) ORDER BY date ASC;`,
        [programName]
    );

    return sessions.map((s) => {
        const logs = db.getAllSync<{ id: string; exerciseName: string }>(
            `SELECT id, exerciseName FROM exercise_logs WHERE sessionId = ?;`, [s.id]
        );

        let totalVolume = 0;
        let maxWeight = 0;
        const exerciseBreakdown: ProgramSessionPoint["exerciseBreakdown"] = [];

        for (const log of logs) {
            const sets = db.getAllSync<{ weight: number; reps: number }>(
                `SELECT weight, reps FROM sets WHERE exerciseLogId = ?;`, [log.id]
            );
            if (sets.length === 0) continue;
            const exVol = sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
            const exMax = Math.max(...sets.map((s) => s.weight));
            totalVolume += exVol;
            if (exMax > maxWeight) maxWeight = exMax;
            exerciseBreakdown.push({ name: log.exerciseName, maxWeight: exMax, totalVolume: exVol });
        }

        return { date: s.date, totalVolume, maxWeight, exerciseBreakdown };
    }).filter((p) => p.exerciseBreakdown.length > 0);
}