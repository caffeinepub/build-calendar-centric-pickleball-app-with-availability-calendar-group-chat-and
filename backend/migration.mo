import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Storage "blob-storage/Storage";

module {
  type OldUserEntry = {
    principal : Principal;
    profile : {
      name : Text;
      customProfilePicture : ?Storage.ExternalBlob;
    };
    createdAt : Int;
  };

  type OldUserStats = {
    wins : Nat;
    losses : Nat;
    totalGames : Nat;
    streak : Int;
    bestStreak : Int;
  };

  type OldDailyLog = {
    wins : Nat;
    losses : Nat;
  };

  type OldAvailability = {
    time : Text;
    notes : ?Text;
  };

  type OldReactionType = { #like; #dislike };

  type OldPost = {
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

  type OldDayAvailabilityCount = {
    day : Int;
    count : Nat;
  };

  type OldBadgeCriteria = {
    #winsStreak : Nat;
    #totalWins : Nat;
    #totalGames : Nat;
  };

  type OldBadgeDefinition = {
    id : Text;
    name : Text;
    description : Text;
    criteria : OldBadgeCriteria;
  };

  type OldBadgeAward = {
    user : Principal;
    badgeId : Text;
    awardedAt : Int;
  };

  type OldActor = {
    loginRecords : Map.Map<Principal, Int>;
    userProfiles : Map.Map<Principal, OldUserEntry>;
    userStats : Map.Map<Principal, OldUserStats>;
    availabilities : Map.Map<(Principal, Int), OldAvailability>;
    posts : Map.Map<Int, OldPost>;
    reactions : Map.Map<(Principal, Int), OldReactionType>;
    dailyLogs : Map.Map<(Principal, Int), OldDailyLog>;
    badgeDefinitions : Map.Map<Text, OldBadgeDefinition>;
    badgeAwards : Map.Map<Principal, Set.Set<Text>>;
    messageCounter : Int;
  };

  type MonthCriteria = {
    year : Nat;
    month : Nat;
    matchesThreshold : Nat;
  };

  type NewBadgeCriteria = {
    #winsStreak : Nat;
    #totalWins : Nat;
    #totalGames : Nat;
    #totalDaysAvailable : Nat;
    #totalGamesPlayed : Nat;
    #firstMatchLogged : Nat;
    #winPercentage : Nat;
    #bestWinStreak : Nat;
    #totalChatMessages : Nat;
    #totalLikesReceived : Nat;
    #firstImageUploaded : Nat;
    #topLeaderboardPosition : Nat;
    #daysAtNumber1 : Nat;
    #monthlyParticipation : MonthCriteria;
    #consecutiveWeeksAvailable : Nat;
  };

  type NewBadgeDefinition = {
    id : Text;
    name : Text;
    description : Text;
    criteria : NewBadgeCriteria;
  };

  type NewActor = {
    loginRecords : Map.Map<Principal, Int>;
    userProfiles : Map.Map<Principal, OldUserEntry>;
    userStats : Map.Map<Principal, OldUserStats>;
    availabilities : Map.Map<(Principal, Int), OldAvailability>;
    posts : Map.Map<Int, OldPost>;
    reactions : Map.Map<(Principal, Int), OldReactionType>;
    dailyLogs : Map.Map<(Principal, Int), OldDailyLog>;
    badgeDefinitions : Map.Map<Text, NewBadgeDefinition>;
    badgeAwards : Map.Map<Principal, Set.Set<Text>>;
    messageCounter : Int;
  };

  public func run(old : OldActor) : NewActor {
    let newBadgeDefinitions = old.badgeDefinitions.map<Text, OldBadgeDefinition, NewBadgeDefinition>(
      func(_id, oldDef) {
        {
          oldDef with
          criteria = convertCriteria(oldDef.criteria);
        };
      }
    );
    { old with badgeDefinitions = newBadgeDefinitions };
  };

  func convertCriteria(oldCriteria : OldBadgeCriteria) : NewBadgeCriteria {
    switch (oldCriteria) {
      case (#winsStreak(val)) { #winsStreak(val) };
      case (#totalWins(val)) { #totalWins(val) };
      case (#totalGames(val)) { #totalGames(val) };
    };
  };
};
