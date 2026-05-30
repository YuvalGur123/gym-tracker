export type Exercise = {
    id: string;
    name: string;
};

export type Program = {
    id: string;
    name: string;
    exercises: Exercise[];
};

export type LoggedSet = {
    id: string;
    weight: number;
    reps: number;
};

export type ExerciseLog = {
    exerciseId: string;
    exerciseName: string;
    sets: LoggedSet[];
};

export type Session = {
    id: string;
    program: Program;
    date: string;
    exerciseLogs: ExerciseLog[];
};
