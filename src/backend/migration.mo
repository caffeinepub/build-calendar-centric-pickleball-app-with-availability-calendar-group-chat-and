import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Int "mo:core/Int";

module {
  type OldActor = {
    userStats : Map.Map<Principal, { wins : Nat; losses : Nat; totalGames : Nat; streak : Int; bestStreak : Int }>;
    dailyLogs : Map.Map<(Principal, Int), { wins : Nat; losses : Nat }>;
    availabilities : Map.Map<(Principal, Int), { time : Text; notes : ?Text }>;
  };

  type AllTimeStats = { wins : Nat; losses : Nat; totalGames : Nat; bestStreakEver : Int };

  type NewActor = {
    userStats : Map.Map<Principal, { wins : Nat; losses : Nat; totalGames : Nat; streak : Int; bestStreak : Int }>;
    dailyLogs : Map.Map<(Principal, Int), { wins : Nat; losses : Nat }>;
    availabilities : Map.Map<(Principal, Int), { time : Text; notes : ?Text }>;
    allTimeStats : Map.Map<Principal, AllTimeStats>;
  };

  func calculateBestStreak(user : Principal, dailyLogs : Map.Map<(Principal, Int), { wins : Nat; losses : Nat }>) : Int {
    var currentStreak = 0;
    var bestStreak = 0;

    // Filter user logs
    let userLogs = dailyLogs.entries().toArray().filter(
      func((key, _)) { key.0 == user }
    );

    let compareLogsByDay = func(a : ((Principal, Int), { wins : Nat; losses : Nat }), b : ((Principal, Int), { wins : Nat; losses : Nat })) : { #less; #equal; #greater } {
      Int.compare(a.0.1, b.0.1);
    };

    // Sort logs by day
    let sortedLogs = userLogs.sort(compareLogsByDay);

    for (((_, _), log) in sortedLogs.values()) {
      // Increase current streak for each win
      if (log.wins > 0) {
        currentStreak += log.wins;
        if (currentStreak > bestStreak) {
          bestStreak := currentStreak;
        };
      };

      var j = 0;
      while (j < log.losses) {
        currentStreak := 0; // Reset streak on loss
        j += 1;
      };
    };

    bestStreak;
  };

  func calculateAllTimeStats(
    userStats : Map.Map<Principal, { wins : Nat; losses : Nat; totalGames : Nat; streak : Int; bestStreak : Int }>,
    dailyLogs : Map.Map<(Principal, Int), { wins : Nat; losses : Nat }>,
  ) : Map.Map<Principal, AllTimeStats> {
    let allTimeStats = Map.empty<Principal, AllTimeStats>();

    for ((user, stats) in userStats.entries()) {
      let bestStreak = calculateBestStreak(user, dailyLogs);
      let allTimeStat : AllTimeStats = {
        wins = stats.wins;
        losses = stats.losses;
        totalGames = stats.totalGames;
        bestStreakEver = bestStreak;
      };
      allTimeStats.add(user, allTimeStat);
    };

    allTimeStats;
  };

  public func run(old : OldActor) : NewActor {
    let allTimeStats = calculateAllTimeStats(old.userStats, old.dailyLogs);
    { old with allTimeStats };
  };
};
