import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import List "mo:core/List";
import Time "mo:core/Time";

module {
  // Old
  public type UserProfile = { name : Text; customProfilePicture : ?Blob };
  public type UserEntry = { principal : Principal; profile : UserProfile; createdAt : Int };
  public type DailyLog = { wins : Nat; losses : Nat };
  public type AllTimeStats = { wins : Nat; losses : Nat; totalGames : Nat; bestStreakEver : Int };
  public type OldActor = {
    // Only the persistent data needed for migration
    userProfiles : Map.Map<Principal, UserEntry>;
    dailyLogs : Map.Map<(Principal, Int), DailyLog>;
    allTimeStats : Map.Map<Principal, AllTimeStats>;
  };

  // New
  public type IndividualMatchResult = {
    player : Principal;
    result : { #win; #loss };
    timestamp : Int; // Time.now() nanoseconds
    dayInt : Int;
  };
  public type NewActor = {
    userProfiles : Map.Map<Principal, UserEntry>;
    dailyLogs : Map.Map<(Principal, Int), DailyLog>;
    allTimeStats : Map.Map<Principal, AllTimeStats>;
    individualResults : Map.Map<Int, IndividualMatchResult>;
  };

  public func run(old : OldActor) : NewActor {
    let individualResults = Map.empty<Int, IndividualMatchResult>();
    var timestamp = Time.now();
    for (((player, dayInt), dailyLog) in old.dailyLogs.entries()) {
      let resultList = List.empty<IndividualMatchResult>();
      for (_ in Nat.range(0, dailyLog.wins)) {
        resultList.add({
          player;
          result = #win;
          timestamp;
          dayInt;
        });
        timestamp += 1;
      };
      for (_ in Nat.range(0, dailyLog.losses)) {
        resultList.add({
          player;
          result = #loss;
          timestamp;
          dayInt;
        });
        timestamp += 1;
      };
      let resultsArray = resultList.toArray();
      for (result in resultsArray.values()) {
        individualResults.add(result.timestamp, result);
      };
    };
    {
      old with
      individualResults
    };
  };
};
