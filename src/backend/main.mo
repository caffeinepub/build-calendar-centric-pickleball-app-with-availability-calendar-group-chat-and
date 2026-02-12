import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
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

    public func compareByWinPercentage(a : (Principal, T), b : (Principal, T)) : Order.Order {
      let aPercentage = calculateWinPercentage(a.1.wins, a.1.losses);
      let bPercentage = calculateWinPercentage(b.1.wins, b.1.losses);

      switch (Int.compare(bPercentage, aPercentage)) {
        case (#equal) {
          Int.compare(b.1.wins, a.1.wins);
        };
        case (order) { order };
      };
    };
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

  var loginRecords : Map.Map<Principal, Int> = Map.empty<Principal, Int>();
  let userProfiles = Map.empty<Principal, UserEntry>();
  let userStats = Map.empty<Principal, UserStats.T>();
  let availabilities = Map.empty<(Principal, Int), Availability>();
  let chatMessages = Map.empty<Int, (Principal, Text, Int)>();
  var messageCounter : Int = 0;

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

  public query ({ caller }) func getTopPlayersByWinPercentage(limit : Nat) : async [(Principal, UserStats.T)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stats");
    };

    let sortedLeaderboard = userStats.entries().toArray().sort(
      UserStats.compareByWinPercentage
    );

    Array.tabulate(
      Nat.min(sortedLeaderboard.size(), limit),
      func(i) { sortedLeaderboard[i] },
    );
  };

  public query ({ caller }) func getWinPercentageLeaderboardWithStats() : async [
    (Principal, UserStats.T, Int)
  ] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stats");
    };

    let leaderboardArray = userStats.entries().toArray();
    let leaderboardWithStats = leaderboardArray.map(
      func((id, stats)) {
        (id, stats, calculateWinPercentage(stats.wins, stats.losses));
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

    let sortedLeaderboard = userStats.entries().toArray().sort(
      func(a, b) { UserStats.compareByWinPercentage(a, b) }
    );

    sortedLeaderboard;
  };

  public shared ({ caller }) func recordWin() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update stats");
    };

    ensureUserStatsInitialized(caller);

    let currentStats = switch (userStats.get(caller)) {
      case (null) {
        {
          wins = 0;
          losses = 0;
          totalGames = 0;
          streak = 0;
        };
      };
      case (?stats) { stats };
    };

    let newStats = {
      wins = currentStats.wins + 1;
      losses = currentStats.losses;
      totalGames = currentStats.totalGames + 1;
      streak = if (currentStats.streak >= 0) {
        currentStats.streak + 1;
      } else {
        1;
      };
    };

    userStats.add(caller, newStats);
  };

  public shared ({ caller }) func recordLoss() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update stats");
    };

    ensureUserStatsInitialized(caller);

    let currentStats = switch (userStats.get(caller)) {
      case (null) {
        {
          wins = 0;
          losses = 0;
          totalGames = 0;
          streak = 0;
        };
      };
      case (?stats) { stats };
    };

    let newStats = {
      wins = currentStats.wins;
      losses = currentStats.losses + 1;
      totalGames = currentStats.totalGames + 1;
      streak = if (currentStats.streak > 0) { -1 } else { currentStats.streak - 1 };
    };

    userStats.add(caller, newStats);
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

    availabilities.keys().any(
      func((_, d)) {
        d == day;
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

  func calculateWinPercentage(wins : Nat, losses : Nat) : Int {
    switch (wins, losses) {
      case (0, 0) { 0 };
      case (wins, 0) { 100 };
      case (_, _) {
        let winsFloat = wins.toInt() * 100;
        let totalGamesFloat = (wins + losses).toInt() : Int;
        winsFloat / totalGamesFloat;
      };
    };
  };
};
