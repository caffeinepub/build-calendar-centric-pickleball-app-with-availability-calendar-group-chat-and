import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  let accessControlState = AccessControl.initState();
  include MixinStorage();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
    customProfilePicture : ?Storage.ExternalBlob;
  };

  public type UserEntry = {
    principal : Principal;
    profile : UserProfile;
    createdAt : Int;
  };

  module UserStats {
    public type T = {
      wins : Nat;
      losses : Nat;
      totalGames : Nat;
      streak : Int;
    };

    public func compareByScore(a : (Principal, T), b : (Principal, T)) : Order.Order {
      let aScore = calculateScore(a.1.wins, a.1.losses);
      let bScore = calculateScore(b.1.wins, b.1.losses);

      switch (Int.compare(bScore, aScore)) {
        case (#equal) {
          Int.compare(b.1.wins, a.1.wins);
        };
        case (order) { order };
      };
    };
  };

  public type DailyLog = {
    wins : Nat;
    losses : Nat;
  };

  type Availability = {
    time : Text;
    notes : ?Text;
  };

  module Availability {
    public type Key = (Principal, Int);

    public func compare(a : Key, b : Key) : Order.Order {
      switch (Principal.compare(a.0, b.0)) {
        case (#equal) { Int.compare(a.1, b.1) };
        case (order) { order };
      };
    };
  };

  module DayWithLog {
    public type T = {
      day : Int;
      wins : Nat;
      losses : Nat;
    };

    public func compareByDay(a : T, b : T) : Order.Order {
      Int.compare(b.day, a.day);
    };
  };

  type DayWithLog = DayWithLog.T;

  var loginRecords : Map.Map<Principal, Int> = Map.empty<Principal, Int>();
  let userProfiles = Map.empty<Principal, UserEntry>();
  let userStats = Map.empty<Principal, UserStats.T>();
  let availabilities = Map.empty<(Principal, Int), Availability>();
  let chatMessages = Map.empty<Int, (Principal, Text, Int)>();
  let dailyLogs = Map.empty<(Principal, Int), DailyLog>();
  var messageCounter : Int = 0;

  // New function to check any user's availability for a day
  public query ({ caller }) func anyUserHasAvailability(day : Int) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view availability");
    };
    for (((_user, dayKey), _availability) in availabilities.entries()) {
      if (dayKey == day) { return true };
    };
    false;
  };

  // New function to check which days (from given range of days) have availability from any user
  public query ({ caller }) func daysWithAnyAvailability(days : [Int]) : async [Bool] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view availability");
    };
    days.map(func(day) { anyUserHasAvailabilitySync(day) });
  };

  // Helper function for synchronous context
  func anyUserHasAvailabilitySync(day : Int) : Bool {
    for (((_user, dayKey), _availability) in availabilities.entries()) {
      if (dayKey == day) { return true };
    };
    false;
  };

  public query ({ caller }) func getCallerAvailableDaysWithLogs() : async [DayWithLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their available days");
    };

    let callerAvailabilities = availabilities.filter(
      func((key, _)) { key.0 == caller }
    ).toArray();

    let currentDay = getCurrentDay();
    let recentDaysWithLogsArray = Array.tabulate(
      if (callerAvailabilities.size() > 5) { 5 } else {
        callerAvailabilities.size();
      },
      func(i) {
        let availability = callerAvailabilities[i];
        let day = availability.0.1;
        let dailyLog = switch (dailyLogs.get((caller, day))) {
          case (null) { { wins = 0; losses = 0 } };
          case (?log) { log };
        };

        {
          day;
          wins = dailyLog.wins;
          losses = dailyLog.losses;
        };
      },
    );

    let sortedRecentDaysWithLogs = recentDaysWithLogsArray.sort(
      DayWithLog.compareByDay
    );

    sortedRecentDaysWithLogs.sliceToArray(0, sortedRecentDaysWithLogs.size());
  };

  public shared ({ caller }) func recordLoginTime() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record login time");
    };
    loginRecords.add(caller, Time.now());
  };

  public shared ({ caller }) func deleteUser(userToDelete : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete users");
    };

    userProfiles.remove(userToDelete);
    userStats.remove(userToDelete);
    loginRecords.remove(userToDelete);

    let keysToRemove = availabilities.entries().filter(
      func((key, _)) { key.0 == userToDelete }
    ).toArray();

    for ((key, _) in keysToRemove.values()) {
      availabilities.remove(key);
    };
  };

  public shared ({ caller }) func deleteAllDayAvailabilities(day : Int) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete days");
    };

    let keysToRemove = availabilities.filter(
      func((key, _)) { key.1 == day }
    ).toArray();
    for ((key, _) in keysToRemove.values()) {
      availabilities.remove(key);
    };
  };

  public shared ({ caller }) func deleteCallerDayAvailability(day : Int) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete their own availability");
    };

    availabilities.remove((caller, day));
  };

  public shared ({ caller }) func deleteUserDayAvailability(user : Principal, day : Int) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete specific user-day availability");
    };

    let key = (user, day);
    if (not availabilities.containsKey(key)) {
      Runtime.trap("Availability entry not found for given user and day");
    };
    availabilities.remove(key);
  };

  public query ({ caller }) func getAllLoginTimestamps() : async [(Principal, Int)] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view login timestamps");
    };

    loginRecords.toArray();
  };

  public query ({ caller }) func getTopPlayersByScore(limit : Nat, timeframe : Text) : async [(Principal, UserStats.T)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stats");
    };

    let filteredStats = userStats.entries().toArray().map(
      func(entry) { filterStatsForTimeframe(entry, timeframe) }
    );
    let sortedLeaderboard = filteredStats.sort(UserStats.compareByScore);

    Array.tabulate(
      Nat.min(sortedLeaderboard.size(), limit),
      func(i) { sortedLeaderboard[i] },
    );
  };

  public query ({ caller }) func getScoreLeaderboardWithStats() : async [
    (Principal, UserStats.T, Int)
  ] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stats");
    };

    let leaderboardArray = userStats.entries().toArray();
    let leaderboardWithStats = leaderboardArray.map(
      func((id, stats)) {
        (id, stats, calculateScore(stats.wins, stats.losses));
      }
    );

    let sortedLeaderboard = leaderboardWithStats.sort(
      func(a, b) { Int.compare(b.2, a.2) }
    );

    sortedLeaderboard;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (userProfiles.get(caller)) {
      case (null) { null };
      case (?entry) { ?entry.profile };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (userProfiles.get(user)) {
      case (null) { null };
      case (?entry) { ?entry.profile };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    ensureUserStatsInitialized(caller);

    let userEntry = {
      principal = caller;
      profile;
      createdAt = Time.now();
    };
    userProfiles.add(caller, userEntry);
  };

  public query ({ caller }) func getAllRegisteredUsers() : async [(Principal, UserProfile, Int)] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all registered users");
    };

    userProfiles.entries().toArray().map(
      func((principal, entry)) { (principal, entry.profile, entry.createdAt) }
    );
  };

  public query ({ caller }) func getAllAvailabilities() : async [
    (Principal, Int, Text)
  ] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all availabilities");
    };

    availabilities.entries().toArray().map(
      func(((principal, day), availability)) {
        (principal, day, availability.time);
      }
    );
  };

  private func ensureUserStatsInitialized(user : Principal) {
    switch (userStats.get(user)) {
      case (null) {
        let stats : UserStats.T = {
          wins = 0;
          losses = 0;
          totalGames = 0;
          streak = 0;
        };
        userStats.add(user, stats);
      };
      case (?_) {};
    };
  };

  public query ({ caller }) func getCallerStats() : async ?UserStats.T {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stats");
    };
    userStats.get(caller);
  };

  public query ({ caller }) func getUserStats(user : Principal) : async ?UserStats.T {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stats");
    };
    userStats.get(user);
  };

  public shared ({ caller }) func updateCallerStats(stats : UserStats.T) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update stats");
    };
    userStats.add(caller, stats);
  };

  public query ({ caller }) func getLeaderboard(timeFilter : Text) : async [(Principal, UserStats.T)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leaderboard");
    };

    let filteredStats = userStats.entries().toArray().map(
      func(entry) { filterStatsForTimeframe(entry, timeFilter) }
    );

    filteredStats.sort(UserStats.compareByScore);
  };

  public shared ({ caller }) func recordDailyWin(day : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record daily wins");
    };

    if (not hasAvailabilityInternal(caller, day)) {
      Runtime.trap("You can only record wins on days you have marked as available");
    };

    updateDailyLog(caller, day, true);
  };

  public shared ({ caller }) func recordDailyLoss(day : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record daily losses");
    };

    if (not hasAvailabilityInternal(caller, day)) {
      Runtime.trap("You can only record losses on days you have marked as available");
    };

    updateDailyLog(caller, day, false);
  };

  // New function to decrement daily logs
  public shared ({ caller }) func decrementDailyLog(day : Int, isWin : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify daily logs");
    };

    let currentLog = switch (dailyLogs.get((caller, day))) {
      case (null) { { wins = 0; losses = 0 } };
      case (?log) { log };
    };

    let updatedLog = {
      wins = if (isWin) {
        if (currentLog.wins > 0) { currentLog.wins - 1 : Nat } else {
          0;
        };
      } else { currentLog.wins };
      losses = if (isWin) {
        currentLog.losses;
      } else if (currentLog.losses > 0) {
        currentLog.losses - 1 : Nat;
      } else { 0 };
    };

    dailyLogs.add((caller, day), updatedLog);

    updateOverallStats(caller); // Recalculate stats after modification
  };

  func updateDailyLog(user : Principal, day : Int, isWin : Bool) {
    let currentLog = switch (dailyLogs.get((user, day))) {
      case (null) { { wins = 0; losses = 0 } };
      case (?log) { log };
    };

    let updatedLog = {
      wins = if (isWin) { currentLog.wins + 1 } else {
        currentLog.wins;
      };
      losses = if (isWin) { currentLog.losses } else {
        currentLog.losses + 1;
      };
    };

    dailyLogs.add((user, day), updatedLog);

    updateOverallStats(user);
  };

  func updateOverallStats(user : Principal) {
    var totalWins = 0;
    var totalLosses = 0;

    for (((principal, _), log) in dailyLogs.entries()) {
      if (principal == user) {
        totalWins += log.wins;
        totalLosses += log.losses;
      };
    };

    let totalGames = totalWins + totalLosses;

    let stats = {
      wins = totalWins;
      losses = totalLosses;
      totalGames;
      streak = calculateStreak(user);
    };
    userStats.add(user, stats);
  };

  func calculateStreak(user : Principal) : Int {
    var streak = 0;
    var foundWin = false;

    let dailyLogsArray = dailyLogs.entries().toArray();

    for (((principal, _), log) in dailyLogsArray.values()) {
      if (principal == user) {
        if (log.wins > 0) {
          if (not foundWin) {
            foundWin := true;
            streak := 1;
          } else {
            switch (streak) {
              case (-1) { return 1 };
              case (_) { streak += 1 };
            };
          };
        } else if (log.losses > 0) { return -1 };
      };
    };
    streak;
  };

  public shared ({ caller }) func addAvailability(day : Int, time : Text, notes : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add availability");
    };

    ensureUserStatsInitialized(caller);

    let availability : Availability = { time; notes };
    availabilities.add((caller, day), availability);
  };

  public query ({ caller }) func getDayAvailability(day : Int) : async [(Principal, Availability)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view availability");
    };

    let filtered = availabilities.entries().filter(
      func(((principal, d), _)) { d == day }
    ).toArray();

    filtered.map(
      func(((principal, _), availability)) {
        (principal, availability);
      }
    );
  };

  public query ({ caller }) func hasAvailability(day : Int) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check availability");
    };

    hasAvailabilityInternal(caller, day);
  };

  func hasAvailabilityInternal(user : Principal, day : Int) : Bool {
    availabilities.keys().any(
      func((principal, d)) {
        principal == user and d == day;
      }
    );
  };

  public query ({ caller }) func getCallerAvailability(day : Int) : async ?Availability {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their availability");
    };

    availabilities.get((caller, day));
  };

  public shared ({ caller }) func sendMessage(message : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    ensureUserStatsInitialized(caller);

    let timestamp = Time.now();
    chatMessages.add(messageCounter, (caller, message, timestamp));
    messageCounter += 1;
  };

  public query ({ caller }) func getRecentMessages(limit : Nat) : async [(Principal, Text, Int)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };

    let allMessages = chatMessages.values().toArray();
    let sorted = allMessages.sort(
      func(a, b) { Int.compare(b.2, a.2) }
    );

    Array.tabulate(
      if (sorted.size() < limit) { sorted.size() } else { limit },
      func(i) { sorted[i] },
    );
  };

  func calculateScore(wins : Nat, losses : Nat) : Int {
    let games = wins + losses;
    let winsWeighted = wins * 100;
    let numerator = winsWeighted + 5 * 100;
    let denominator = (games + 10).toInt() : Int;

    if (denominator == 0) { return 0 };

    numerator / denominator;
  };

  func filterStatsForTimeframe(entry : (Principal, UserStats.T), timeframe : Text) : (Principal, UserStats.T) {
    let (principal, stats) = entry;
    let currentDay = getCurrentDay();

    let daysInTimeframe : ?Nat = switch (timeframe) {
      case ("weekly") { ?7 };
      case ("monthly") { ?30 };
      case ("all") { null };
      case (_) { ?30 };
    };

    var filteredWins = 0;
    var filteredLosses = 0;

    for (((logPrincipal, day), log) in dailyLogs.entries()) {
      if (principal == logPrincipal) {
        let withinTimeframe = switch (daysInTimeframe) {
          case (null) { true };
          case (?days) { day >= (currentDay - days) };
        };
        if (withinTimeframe) {
          filteredWins += log.wins;
          filteredLosses += log.losses;
        };
      };
    };

    let filteredStats = {
      wins = filteredWins;
      losses = filteredLosses;
      totalGames = filteredWins + filteredLosses;
      streak = stats.streak;
    };

    (principal, filteredStats);
  };

  func getCurrentDay() : Int {
    Time.now() / (24 * 60 * 60 * 1_000_000_000 : Int);
  };

  func getDayTimestamp(day : Int) : Int {
    let dayTimestampNanos = 24 * 60 * 60 * 1_000_000_000 : Int;
    dayTimestampNanos * day;
  };
};
