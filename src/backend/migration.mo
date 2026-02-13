import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Old types
  type OldUserStats = {
    wins : Nat;
    losses : Nat;
    totalGames : Nat;
    streak : Int;
  };

  type OldDailyLog = {
    wins : Nat;
    losses : Nat;
  };

  type OldActor = {
    userStats : Map.Map<Principal, OldUserStats>;
    dailyLogs : Map.Map<(Principal, Int), OldDailyLog>;
  };

  // New types (same as old for current migration)
  type NewUserStats = OldUserStats;
  type NewDailyLog = OldDailyLog;

  type NewActor = {
    userStats : Map.Map<Principal, NewUserStats>;
    dailyLogs : Map.Map<(Principal, Int), NewDailyLog>;
  };

  public func run(old : OldActor) : NewActor {
    // For this migration, the types are compatible, so we simply reassign
    {
      userStats = old.userStats;
      dailyLogs = old.dailyLogs;
    };
  };
};
