class Quest {
  final String id;
  final String title;
  final String description;
  final String giverName;
  final String targetName;
  final int targetCount;
  int currentCount;
  final int rewardXp;
  final int rewardGold;
  final String? rewardItemId;
  bool isAccepted;
  bool isCompleted;
  bool isClaimed;

  Quest({
    required this.id,
    required this.title,
    required this.description,
    required this.giverName,
    required this.targetName,
    required this.targetCount,
    this.currentCount = 0,
    required this.rewardXp,
    required this.rewardGold,
    this.rewardItemId,
    this.isAccepted = false,
    this.isCompleted = false,
    this.isClaimed = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'currentCount': currentCount,
        'isAccepted': isAccepted,
        'isCompleted': isCompleted,
        'isClaimed': isClaimed,
      };

  Quest copyWith({
    int? currentCount,
    bool? isAccepted,
    bool? isCompleted,
    bool? isClaimed,
  }) {
    return Quest(
      id: id,
      title: title,
      description: description,
      giverName: giverName,
      targetName: targetName,
      targetCount: targetCount,
      currentCount: currentCount ?? this.currentCount,
      rewardXp: rewardXp,
      rewardGold: rewardGold,
      rewardItemId: rewardItemId,
      isAccepted: isAccepted ?? this.isAccepted,
      isCompleted: isCompleted ?? this.isCompleted,
      isClaimed: isClaimed ?? this.isClaimed,
    );
  }
}
