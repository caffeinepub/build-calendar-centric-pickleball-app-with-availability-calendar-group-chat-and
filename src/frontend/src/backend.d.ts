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
export interface UserProfile {
    name: string;
    customProfilePicture?: ExternalBlob;
}
export interface SeasonSnapshot {
    leaderboard: Array<[Principal, T]>;
    year: bigint;
}
export interface Availability {
    time: string;
    notes?: string;
}
export interface MonthCriteria {
    month: bigint;
    matchesThreshold: bigint;
    year: bigint;
}
export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    criteria: BadgeCriteria;
}
export type BadgeCriteria = {
    __kind__: "consecutiveWeeksAvailable";
    consecutiveWeeksAvailable: bigint;
} | {
    __kind__: "firstMatchLogged";
    firstMatchLogged: bigint;
} | {
    __kind__: "totalGamesPlayed";
    totalGamesPlayed: bigint;
} | {
    __kind__: "daysAtNumber1";
    daysAtNumber1: bigint;
} | {
    __kind__: "totalWins";
    totalWins: bigint;
} | {
    __kind__: "winsStreak";
    winsStreak: bigint;
} | {
    __kind__: "totalChatMessages";
    totalChatMessages: bigint;
} | {
    __kind__: "totalGames";
    totalGames: bigint;
} | {
    __kind__: "topLeaderboardPosition";
    topLeaderboardPosition: bigint;
} | {
    __kind__: "winPercentage";
    winPercentage: bigint;
} | {
    __kind__: "monthlyParticipation";
    monthlyParticipation: MonthCriteria;
} | {
    __kind__: "firstImageUploaded";
    firstImageUploaded: bigint;
} | {
    __kind__: "totalDaysAvailable";
    totalDaysAvailable: bigint;
} | {
    __kind__: "totalLikesReceived";
    totalLikesReceived: bigint;
} | {
    __kind__: "bestWinStreak";
    bestWinStreak: bigint;
};
export interface T {
    streak: bigint;
    wins: bigint;
    losses: bigint;
    totalGames: bigint;
    bestStreak: bigint;
}
export interface Post {
    id: bigint;
    content: string;
    edited: boolean;
    author: Principal;
    editTimestamp?: bigint;
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
export interface PostWithReplies {
    post: Post;
    replies: Array<PostWithReplies>;
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
    awardBadgeToUser(user: Principal, badgeId: string): Promise<void>;
    createBadgeDefinition(definition: BadgeDefinition): Promise<void>;
    daysWithAnyAvailability(days: Array<bigint>): Promise<Array<boolean>>;
    decrementDailyLog(day: bigint, isWin: boolean): Promise<void>;
    deleteAllDayAvailabilities(day: bigint): Promise<void>;
    deleteBadgeDefinition(definitionId: string): Promise<void>;
    deleteCallerDayAvailability(day: bigint): Promise<void>;
    deletePost(postId: bigint): Promise<void>;
    deleteUser(userToDelete: Principal): Promise<void>;
    deleteUserDayAvailability(user: Principal, day: bigint): Promise<void>;
    editPost(postId: bigint, newContent: string): Promise<void>;
    finalizeCurrentSeason(year: bigint): Promise<void>;
    getAllAvailabilities(): Promise<Array<[Principal, bigint, string]>>;
    getAllBadgeDefinitions(): Promise<Array<BadgeDefinition>>;
    getAllDayAvailabilityCounts(): Promise<Array<DayAvailabilityCount>>;
    getAllLoginTimestamps(): Promise<Array<[Principal, bigint]>>;
    getAllRegisteredUsers(): Promise<Array<[Principal, UserProfile, bigint]>>;
    getCallerAvailability(day: bigint): Promise<Availability | null>;
    getCallerAvailableDaysWithLogs(): Promise<Array<DayWithLog>>;
    getCallerStats(): Promise<T | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentSeasonLeaderboard(): Promise<Array<[Principal, T]>>;
    getDayAvailability(day: bigint): Promise<Array<[Principal, Availability]>>;
    getLeaderboard(): Promise<Array<[Principal, T]>>;
    getPastSeasonSnapshots(): Promise<Array<SeasonSnapshot>>;
    getPostWithReplies(postId: bigint): Promise<PostWithReplies | null>;
    getPosts(limit: bigint, offset: bigint): Promise<Array<Post>>;
    getReplies(postId: bigint): Promise<Array<Post>>;
    getScoreLeaderboardWithStats(): Promise<Array<[Principal, T, bigint]>>;
    getTopPlayersByScore(limit: bigint): Promise<Array<[Principal, T]>>;
    getTotalPostCount(): Promise<bigint>;
    getUserBadges(user: Principal): Promise<Array<string>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStats(user: Principal): Promise<T | null>;
    hasAvailability(day: bigint): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    recordDailyLoss(day: bigint): Promise<void>;
    recordDailyWin(day: bigint): Promise<void>;
    recordLoginTime(): Promise<void>;
    removeReaction(postId: bigint): Promise<void>;
    revokeBadgeFromUser(user: Principal, badgeId: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBadgeDefinition(definition: BadgeDefinition): Promise<void>;
    updateCallerStats(stats: T): Promise<void>;
}
