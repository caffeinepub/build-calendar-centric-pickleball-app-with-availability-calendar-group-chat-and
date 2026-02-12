import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Availability {
    time: string;
    notes?: string;
}
export interface T {
    streak: bigint;
    wins: bigint;
    losses: bigint;
    totalGames: bigint;
}
export interface UserProfile {
    name: string;
    customProfilePicture?: ExternalBlob;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAvailability(day: bigint, time: string, notes: string | null): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteAllDayAvailabilities(day: bigint): Promise<void>;
    deleteCallerDayAvailability(day: bigint): Promise<void>;
    deleteUser(userToDelete: Principal): Promise<void>;
    deleteUserDayAvailability(user: Principal, day: bigint): Promise<void>;
    getAllAvailabilities(): Promise<Array<[Principal, bigint, string]>>;
    getAllLoginTimestamps(): Promise<Array<[Principal, bigint]>>;
    getAllRegisteredUsers(): Promise<Array<[Principal, UserProfile, bigint]>>;
    getCallerAvailability(day: bigint): Promise<Availability | null>;
    getCallerStats(): Promise<T | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDayAvailability(day: bigint): Promise<Array<[Principal, Availability]>>;
    getLeaderboard(timeFilter: string): Promise<Array<[Principal, T]>>;
    getRecentMessages(limit: bigint): Promise<Array<[Principal, string, bigint]>>;
    getTopPlayersByWinPercentage(limit: bigint): Promise<Array<[Principal, T]>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStats(user: Principal): Promise<T | null>;
    getWinPercentageLeaderboardWithStats(): Promise<Array<[Principal, T, bigint]>>;
    hasAvailability(day: bigint): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    recordLoginTime(): Promise<void>;
    recordLoss(): Promise<void>;
    recordWin(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(message: string): Promise<void>;
    updateCallerStats(stats: T): Promise<void>;
}
