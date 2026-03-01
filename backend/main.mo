import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import List "mo:core/List";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";

import Set "mo:core/Set";


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
      bestStreak : Int;
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

  type DayWithLog = {
    day : Int;
    wins : Nat;
    losses : Nat;
  };

  module DayWithLog {
    public func compareByDay(a : DayWithLog, b : DayWithLog) : Order.Order {
      Int.compare(a.day, b.day);
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

  type ReactionType = { #like; #dislike };

  public type Post = {
    id : Int;
    author : Principal;
    content : Text;
    timestamp : Int;
    parentId : ?Int;
    image : ?Storage.ExternalBlob;
    likesCount : Nat;
    dislikesCount : Nat;
    edited : Bool;
    editTimestamp : ?Int;
  };

  module Post {
    public func compareByTimestamp(a : Post, b : Post) : Order.Order {
      Int.compare(b.timestamp, a.timestamp);
    };
  };

  public type PostWithReplies = {
    post : Post;
    replies : [PostWithReplies];
  };

  public type DayAvailabilityCount = {
    day : Int;
    count : Nat;
  };

  public type BadgeCriteria = {
    #winsStreak : Nat;
    #totalWins : Nat;
    #totalGames : Nat;
  };

  public type BadgeDefinition = {
    id : Text;
    name : Text;
    description : Text;
    criteria : BadgeCriteria;
  };

  public type BadgeAward = {
    user : Principal;
    badgeId : Text;
    awardedAt : Int;
  };

  var loginRecords : Map.Map<Principal, Int> = Map.empty<Principal, Int>();
  let userProfiles = Map.empty<Principal, UserEntry>();
  let userStats = Map.empty<Principal, UserStats.T>();
  let availabilities = Map.empty<(Principal, Int), Availability>();
  let posts = Map.empty<Int, Post>();
  let reactions = Map.empty<(Principal, Int), ReactionType>();
  let dailyLogs = Map.empty<(Principal, Int), DailyLog>();
  let badgeDefinitions = Map.empty<Text, BadgeDefinition>();
  let badgeAwards = Map.empty<Principal, Set.Set<Text>>();
  var messageCounter : Int = 0;

  public shared ({ caller }) func createBadgeDefinition(definition : BadgeDefinition) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admin can create badge definitions");
    };

    badgeDefinitions.add(definition.id, definition);
  };

  public shared ({ caller }) func updateBadgeDefinition(definition : BadgeDefinition) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admin can update badge definitions");
    };

    switch (badgeDefinitions.get(definition.id)) {
      case (null) {
        Runtime.trap("Badge definition not found");
      };
      case (?existing) {
        badgeDefinitions.add(definition.id, definition);
      };
    };
  };

  public shared ({ caller }) func deleteBadgeDefinition(definitionId : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admin can delete badge definitions");
    };

    badgeDefinitions.remove(definitionId);
  };

  public query ({ caller }) func getAllBadgeDefinitions() : async [BadgeDefinition] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view badge definitions");
    };

    badgeDefinitions.values().toArray();
  };

  public query ({ caller }) func getUserBadges(user : Principal) : async [Text] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view badges");
    };

    switch (badgeAwards.get(user)) {
      case (null) { [] };
      case (?awards) { awards.toArray() };
    };
  };

  func evaluateAndAwardBadges(user : Principal, stats : UserStats.T) {
    for ((_, badge) in badgeDefinitions.entries()) {
      if (meetsCriteria(stats, badge.criteria)) {
        let userAwards = switch (badgeAwards.get(user)) {
          case (null) { Set.empty<Text>() };
          case (?awards) { awards };
        };

        if (not userAwards.contains(badge.id)) {
          userAwards.add(badge.id);
          badgeAwards.add(user, userAwards);
        };
      };
    };
  };

  func meetsCriteria(stats : UserStats.T, criteria : BadgeCriteria) : Bool {
    switch (criteria) {
      case (#winsStreak(threshold)) { stats.bestStreak >= threshold };
      case (#totalWins(threshold)) { stats.wins >= threshold };
      case (#totalGames(threshold)) { stats.totalGames >= threshold };
    };
  };

  public query ({ caller }) func getAllDayAvailabilityCounts() : async [DayAvailabilityCount] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view availability counts");
    };

    let dayCountsMap = Map.empty<Int, Nat>();

    for (((_, day), _) in availabilities.entries()) {
      switch (dayCountsMap.get(day)) {
        case (null) {
          dayCountsMap.add(day, 1);
        };
        case (?count) {
          dayCountsMap.add(day, count + 1);
        };
      };
    };

    let results = List.empty<DayAvailabilityCount>();

    for ((day, count) in dayCountsMap.entries()) {
      if (count > 0) {
        results.add({ day; count });
      };
    };

    results.toArray();
  };

  public query ({ caller }) func anyUserHasAvailability(day : Int) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view availability");
    };

    for (((_user, dayKey), _availability) in availabilities.entries()) {
      if (dayKey == day) { return true };
    };
    false;
  };

  public query ({ caller }) func daysWithAnyAvailability(days : [Int]) : async [Bool] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view availability");
    };

    days.map(func(day) { anyUserHasAvailabilitySync(day) });
  };

  func anyUserHasAvailabilitySync(day : Int) : Bool {
    for (((_user, dayKey), _availability) in availabilities.entries()) {
      if (dayKey == day) { return true };
    };
    false;
  };

  public query ({ caller }) func getCallerAvailableDaysWithLogs() : async [DayWithLog] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get available days");
    };

    let entries = availabilities.entries().toArray();

    let filteredAvailabilities = entries.filter(
      func(entry) { entry.0.0 == caller }
    );

    let daysWithLogs = filteredAvailabilities.map(
      func((key, _)) {
        let day = key.1;
        let dailyLog = switch (dailyLogs.get((caller, day))) {
          case (null) { { wins = 0; losses = 0 } };
          case (?log) { log };
        };

        {
          day;
          wins = dailyLog.wins;
          losses = dailyLog.losses;
        };
      }
    );

    daysWithLogs.sort(DayWithLog.compareByDay);
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

    let keysToRemove = availabilities.entries().filter(
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

  public query ({ caller }) func getTopPlayersByScore(limit : Nat) : async [(Principal, UserStats.T)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stats");
    };

    let sortedLeaderboard = userStats.entries().toArray().sort(UserStats.compareByScore);

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

    let userEntry : UserEntry = {
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
          bestStreak = 0;
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

  public query ({ caller }) func getLeaderboard() : async [(Principal, UserStats.T)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leaderboard");
    };

    userStats.entries().toArray().sort(UserStats.compareByScore);
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

    updateOverallStats(caller);
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
      bestStreak = totalWins;
    };
    userStats.add(user, stats);

    evaluateAndAwardBadges(user, stats);
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

    let filtered = availabilities.entries().toArray().filter(
      func(((principal, d), _)) { d == day }
    );

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

  public shared ({ caller }) func addPost(
    content : Text,
    parentId : ?Int,
    image : ?Storage.ExternalBlob,
  ) : async Int {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post messages");
    };

    let post : Post = {
      id = messageCounter;
      author = caller;
      content;
      timestamp = Time.now();
      parentId;
      image;
      likesCount = 0;
      dislikesCount = 0;
      edited = false;
      editTimestamp = null;
    };

    posts.add(messageCounter, post);
    messageCounter += 1;
    post.id;
  };

  public shared ({ caller }) func editPost(postId : Int, newContent : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit posts");
    };

    let existingPost = switch (posts.get(postId)) {
      case (null) {
        Runtime.trap("Post not found");
      };
      case (?post) { post };
    };

    if (caller != existingPost.author) {
      Runtime.trap("Unauthorized: You can only edit your own posts");
    };

    let updatedPost = {
      existingPost with
      content = newContent;
      edited = true;
      editTimestamp = ?Time.now();
    };

    posts.add(postId, updatedPost);
  };

  public shared ({ caller }) func deletePost(postId : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };

    let post = switch (posts.get(postId)) {
      case (null) {
        Runtime.trap("Post not found");
      };
      case (?post) { post };
    };

    if (caller != post.author and (not AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: You can only delete your own posts");
    };

    posts.remove(postId);
  };

  public shared ({ caller }) func addReaction(postId : Int, reactionType : ReactionType) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add reactions");
    };

    if (not posts.containsKey(postId)) {
      Runtime.trap("Post not found");
    };

    switch (reactions.get((caller, postId))) {
      case (null) {
        reactions.add((caller, postId), reactionType);
        updatePostReactionCount(postId, reactionType, true);
      };
      case (?existingReaction) {
        if (existingReaction != reactionType) {
          reactions.add((caller, postId), reactionType);

          let (increaseType, decreaseType) = switch (reactionType) {
            case (#like) { (#like, #dislike) };
            case (#dislike) { (#dislike, #like) };
          };

          updatePostReactionCount(postId, increaseType, true);
          updatePostReactionCount(postId, decreaseType, false);
        };
      };
    };
  };

  public shared ({ caller }) func removeReaction(postId : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove reactions");
    };

    if (not posts.containsKey(postId)) {
      Runtime.trap("Post not found");
    };

    switch (reactions.get((caller, postId))) {
      case (null) {
        Runtime.trap("No reaction to remove");
      };
      case (?reactionType) {
        reactions.remove((caller, postId));
        updatePostReactionCount(postId, reactionType, false);
      };
    };
  };

  func updatePostReactionCount(postId : Int, reactionType : ReactionType, increase : Bool) {
    if (not posts.containsKey(postId)) { return };

    let post = switch (posts.get(postId)) {
      case (null) {
        Runtime.trap("Post not found");
      };
      case (?post) { post };
    };

    let (newLikes, newDislikes) = switch (reactionType) {
      case (#like) {
        let likes = if (increase) { post.likesCount + 1 } else {
          if (post.likesCount > 0) {
            post.likesCount - 1 : Nat;
          } else {
            0;
          };
        };
        (likes, post.dislikesCount);
      };
      case (#dislike) {
        let dislikes = if (increase) {
          post.dislikesCount + 1;
        } else {
          if (post.dislikesCount > 0) {
            post.dislikesCount - 1 : Nat;
          } else {
            0;
          };
        };
        (post.likesCount, dislikes);
      };
    };

    let updatedPost : Post = {
      post with
      likesCount = newLikes;
      dislikesCount = newDislikes;
    };
    posts.add(postId, updatedPost);
  };

  public query ({ caller }) func getPosts(limit : Nat, offset : Nat) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };

    posts.values().toArray().sort(Post.compareByTimestamp).sliceToArray(
      offset,
      Nat.min(offset + limit, posts.size()),
    );
  };

  public query ({ caller }) func getReplies(postId : Int) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view replies");
    };

    posts.values().toArray().filter(
      func(post) {
        switch (post.parentId) {
          case (?parent) { parent == postId };
          case (null) { false };
        };
      }
    );
  };

  public query ({ caller }) func getPostWithReplies(postId : Int) : async ?PostWithReplies {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view full post threads");
    };

    switch (posts.get(postId)) {
      case (null) { null };
      case (?post) {
        ?{ post; replies = buildReplies(postId) };
      };
    };
  };

  func buildReplies(parentId : Int) : [PostWithReplies] {
    let replies = posts.values().toArray().filter(
      func(post) {
        switch (post.parentId) {
          case (?parent) { parent == parentId };
          case (null) { false };
        };
      }
    );

    replies.map(func(reply) { { post = reply; replies = buildReplies(reply.id) } });
  };

  func calculateScore(wins : Nat, losses : Nat) : Int {
    let games = wins + losses;
    let winsWeighted = wins * 100;
    let numerator = winsWeighted + 5 * 100;
    let denominator = (games + 10).toInt() : Int;

    if (denominator == 0) {
      return 0;
    };

    numerator / denominator;
  };

  func getCurrentDay() : Int {
    Time.now() / (24 * 60 * 60 * 1_000_000_000 : Int);
  };
};
