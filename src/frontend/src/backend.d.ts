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
export interface PostWithReplies {
    post: Post;
    replies: Array<PostWithReplies>;
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
export interface Post {
    id: bigint;
    content: string;
    author: Principal;
    timestamp: bigint;
    image?: ExternalBlob;
    parentId?: bigint;
    likesCount: bigint;
    dislikesCount: bigint;
}
export interface DayWithLog {
    day: bigint;
    wins: bigint;
    losses: bigint;
}
export interface DayAvailabilityCount {
    day: bigint;
    count: bigint;
}
export interface UserProfile {
    name: string;
    customProfilePicture?: ExternalBlob;
}
export enum ReactionType {
    like = "like",
    dislike = "dislike"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAvailability(day: bigint, time: string, notes: string | null): Promise<void>;
    addPost(content: string, parentId: bigint | null, image: ExternalBlob | null): Promise<bigint>;
    addReaction(postId: bigint, reactionType: ReactionType): Promise<void>;
    anyUserHasAvailability(day: bigint): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    daysWithAnyAvailability(days: Array<bigint>): Promise<Array<boolean>>;
    decrementDailyLog(day: bigint, isWin: boolean): Promise<void>;
    deleteAllDayAvailabilities(day: bigint): Promise<void>;
    deleteCallerDayAvailability(day: bigint): Promise<void>;
    deleteUser(userToDelete: Principal): Promise<void>;
    deleteUserDayAvailability(user: Principal, day: bigint): Promise<void>;
    getAllAvailabilities(): Promise<Array<[Principal, bigint, string]>>;
    getAllDayAvailabilityCounts(): Promise<Array<DayAvailabilityCount>>;
    getAllLoginTimestamps(): Promise<Array<[Principal, bigint]>>;
    getAllRegisteredUsers(): Promise<Array<[Principal, UserProfile, bigint]>>;
    getCallerAvailability(day: bigint): Promise<Availability | null>;
    getCallerAvailableDaysWithLogs(): Promise<Array<DayWithLog>>;
    getCallerStats(): Promise<T | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDayAvailability(day: bigint): Promise<Array<[Principal, Availability]>>;
    getLeaderboard(): Promise<Array<[Principal, T]>>;
    getPostWithReplies(postId: bigint): Promise<PostWithReplies | null>;
    getPosts(limit: bigint, offset: bigint): Promise<Array<Post>>;
    getReplies(postId: bigint): Promise<Array<Post>>;
    getScoreLeaderboardWithStats(): Promise<Array<[Principal, T, bigint]>>;
    getTopPlayersByScore(limit: bigint): Promise<Array<[Principal, T]>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStats(user: Principal): Promise<T | null>;
    hasAvailability(day: bigint): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    recordDailyLoss(day: bigint): Promise<void>;
    recordDailyWin(day: bigint): Promise<void>;
    recordLoginTime(): Promise<void>;
    removeReaction(postId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCallerStats(stats: T): Promise<void>;
}
