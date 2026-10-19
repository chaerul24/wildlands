import 'package:flutter/material.dart';

class ActionButtons extends StatelessWidget {
  final VoidCallback onAttack;
  final VoidCallback onDodge;
  final VoidCallback onInteract;
  final VoidCallback onOpenBag;
  final VoidCallback onOpenStats;
  final String? interactLabel;
  final double staminaRatio;

  const ActionButtons({
    super.key,
    required this.onAttack,
    required this.onDodge,
    required this.onInteract,
    required this.onOpenBag,
    required this.onOpenStats,
    this.interactLabel,
    required this.staminaRatio,
  });

  @override
  Widget build(BuildContext context) {
    final bool canRoll = staminaRatio >= 0.25;

    return Stack(
      children: [
        // Top right helper buttons: Bag and Stats
        Positioned(
          top: 16,
          right: 16,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildMiniButton(
                icon: Icons.shield_outlined,
                color: const Color(0xFF6366F1),
                tooltip: 'Status Karakter',
                onTap: onOpenStats,
              ),
              const SizedBox(width: 10),
              _buildMiniButton(
                icon: Icons.backpack_outlined,
                color: const Color(0xFF10B981),
                tooltip: 'Tas / Inventory (16 Slot)',
                onTap: onOpenBag,
              ),
            ],
          ),
        ),

        // Contextual Interact Button (Appears when near NPC or Loot Beacon)
        if (interactLabel != null)
          Positioned(
            bottom: 120,
            right: 130,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onInteract,
                borderRadius: BorderRadius.circular(24),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.amber.withOpacity(0.5),
                        blurRadius: 10,
                        spreadRadius: 2,
                      ),
                    ],
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.touch_app, color: Colors.white, size: 20),
                      const SizedBox(width: 6),
                      Text(
                        interactLabel!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

        // Main Combat Action Buttons (Bottom-Right Cluster)
        Positioned(
          bottom: 24,
          right: 24,
          child: SizedBox(
            width: 190,
            height: 190,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // ATTACK BUTTON (Large, Primary Center)
                Positioned(
                  bottom: 20,
                  right: 20,
                  child: GestureDetector(
                    onTapDown: (_) => onAttack(),
                    child: Container(
                      width: 82,
                      height: 82,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFFEF4444), Color(0xFF991B1B)],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.redAccent.withOpacity(0.6),
                            blurRadius: 14,
                            spreadRadius: 2,
                          ),
                        ],
                        border: Border.all(color: const Color(0xFFFCA5A5), width: 3),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.sports_kabaddi, color: Colors.white, size: 36),
                          Text(
                            'SERANG',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // DODGE / ROLL BUTTON (Medium, Left of Attack)
                Positioned(
                  bottom: 25,
                  left: 10,
                  child: GestureDetector(
                    onTapDown: (_) {
                      if (canRoll) onDodge();
                    },
                    child: Opacity(
                      opacity: canRoll ? 1.0 : 0.45,
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFF0EA5E9), Color(0xFF0369A1)],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.cyanAccent.withOpacity(0.4),
                              blurRadius: 10,
                              spreadRadius: 1,
                            ),
                          ],
                          border: Border.all(color: const Color(0xFF7DD3FC), width: 2),
                        ),
                        child: const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.directions_run, color: Colors.white, size: 28),
                            Text(
                              'GULIR',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMiniButton({
    required IconData icon,
    required Color color,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.8), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.3),
                blurRadius: 6,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}
