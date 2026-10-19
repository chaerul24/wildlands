import 'package:flutter/material.dart';
import '../models/quest.dart';

class HUDOverlay extends StatelessWidget {
  final int level;
  final int xp;
  final int xpNeeded;
  final int gold;
  final double hp;
  final double maxHp;
  final double stamina;
  final double maxStamina;
  final Quest activeQuest;
  final String? bannerMessage;

  const HUDOverlay({
    super.key,
    required this.level,
    required this.xp,
    required this.xpNeeded,
    required this.gold,
    required this.hp,
    required this.maxHp,
    required this.stamina,
    required this.maxStamina,
    required this.activeQuest,
    this.bannerMessage,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Top-Left Player Status Bar
        Positioned(
          top: 16,
          left: 16,
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.65),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.2), width: 1.5),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Avatar + Level Badge
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFF59E0B), width: 2),
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1E3A8A), Color(0xFF3B82F6)],
                        ),
                      ),
                      child: const Center(
                        child: Text('⚔️', style: TextStyle(fontSize: 22)),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Lv.$level',
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 10),

                // Health & Stamina Bars
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // HP Bar
                    _buildBar(
                      label: 'HP',
                      current: hp,
                      max: maxHp,
                      color: const Color(0xFF10B981),
                      icon: Icons.favorite,
                      width: 140,
                    ),
                    const SizedBox(height: 5),
                    // Stamina Bar
                    _buildBar(
                      label: 'STA',
                      current: stamina,
                      max: maxStamina,
                      color: const Color(0xFFF59E0B),
                      icon: Icons.bolt,
                      width: 140,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Top-Center/Right: Quest Tracker & Gold
        Positioned(
          top: 60,
          right: 16,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Gold Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.65),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.6)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('🪙', style: TextStyle(fontSize: 14)),
                    const SizedBox(width: 5),
                    Text(
                      '$gold G',
                      style: const TextStyle(
                        color: Color(0xFFFDE047),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Active Quest Card
              if (activeQuest.isAccepted)
                Container(
                  constraints: const BoxConstraints(maxWidth: 220),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: activeQuest.isCompleted
                          ? const Color(0xFF10B981)
                          : const Color(0xFF38BDF8),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Icon(
                            activeQuest.isCompleted
                                ? Icons.check_circle
                                : Icons.flag_circle,
                            color: activeQuest.isCompleted
                                ? const Color(0xFF10B981)
                                : const Color(0xFF38BDF8),
                            size: 16,
                          ),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              activeQuest.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        activeQuest.isCompleted
                            ? 'Bicara dengan Penjaga Rian untuk klaim hadiah!'
                            : '${activeQuest.targetName}: ${activeQuest.currentCount}/${activeQuest.targetCount}',
                        style: TextStyle(
                          color: activeQuest.isCompleted
                              ? const Color(0xFF6EE7B7)
                              : Colors.white70,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        // Notification / Level Up Banner
        if (bannerMessage != null)
          Positioned(
            top: 20,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF4338CA), Color(0xFF6D28D9)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.purpleAccent.withOpacity(0.5),
                      blurRadius: 12,
                      spreadRadius: 2,
                    ),
                  ],
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: Text(
                  bannerMessage!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildBar({
    required String label,
    required double current,
    required double max,
    required Color color,
    required IconData icon,
    required double width,
  }) {
    final ratio = (current / max).clamp(0.0, 1.0);

    return SizedBox(
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, color: color, size: 11),
                  const SizedBox(width: 3),
                  Text(
                    label,
                    style: TextStyle(
                      color: color,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Text(
                '${current.round()} / ${max.round()}',
                style: const TextStyle(color: Colors.white70, fontSize: 10),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Container(
            height: 7,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: Colors.white24, width: 0.5),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: ratio,
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(3),
                  boxShadow: [
                    BoxShadow(
                      color: color.withOpacity(0.6),
                      blurRadius: 4,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
