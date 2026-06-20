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

    try { db.execSync(`ALTER TABLE programs ADD COLUMN sort_order INTEGER DEFAULT 0;`); } catch { }
    try { db.execSync(`ALTER TABLE exercises ADD COLUMN sort_order INTEGER DEFAULT 0;`); } catch { }

    db.execSync(`UPDATE programs SET sort_order = rowid WHERE sort_order = 0;`);
    db.execSync(`UPDATE exercises SET sort_order = rowid WHERE sort_order = 0;`);

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

// ── Export / Import ──────────────────────────────────────

export type BackupData = {
    version: number;
    exportedAt: string;
    programs: { id: string; name: string; sort_order: number }[];
    exercises: { id: string; programId: string; name: string; sort_order: number }[];
    sessions: { id: string; programName: string; date: string }[];
    exercise_logs: { id: string; sessionId: string; exerciseName: string }[];
    sets: { id: string; exerciseLogId: string; weight: number; reps: number }[];
};

export function exportAllData(): BackupData {
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        programs: db.getAllSync(`SELECT id, name, sort_order FROM programs;`),
        exercises: db.getAllSync(`SELECT id, programId, name, sort_order FROM exercises;`),
        sessions: db.getAllSync(`SELECT id, programName, date FROM sessions;`),
        exercise_logs: db.getAllSync(`SELECT id, sessionId, exerciseName FROM exercise_logs;`),
        sets: db.getAllSync(`SELECT id, exerciseLogId, weight, reps FROM sets;`),
    };
}

export function importAllData(backup: BackupData) {
    // Wipe existing data
    db.execSync(`
        DELETE FROM sets;
        DELETE FROM exercise_logs;
        DELETE FROM sessions;
        DELETE FROM exercises;
        DELETE FROM programs;
    `);

    for (const p of backup.programs) {
        db.runSync(
            `INSERT INTO programs (id, name, sort_order) VALUES (?, ?, ?);`,
            [p.id, p.name, p.sort_order]
        );
    }
    for (const e of backup.exercises) {
        db.runSync(
            `INSERT INTO exercises (id, programId, name, sort_order) VALUES (?, ?, ?, ?);`,
            [e.id, e.programId, e.name, e.sort_order]
        );
    }
    for (const s of backup.sessions) {
        db.runSync(
            `INSERT INTO sessions (id, programName, date) VALUES (?, ?, ?);`,
            [s.id, s.programName, s.date]
        );
    }
    for (const l of backup.exercise_logs) {
        db.runSync(
            `INSERT INTO exercise_logs (id, sessionId, exerciseName) VALUES (?, ?, ?);`,
            [l.id, l.sessionId, l.exerciseName]
        );
    }
    for (const s of backup.sets) {
        db.runSync(
            `INSERT INTO sets (id, exerciseLogId, weight, reps) VALUES (?, ?, ?, ?);`,
            [s.id, s.exerciseLogId, s.weight, s.reps]
        );
    }
}