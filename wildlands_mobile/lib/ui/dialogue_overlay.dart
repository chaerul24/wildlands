import 'package:flutter/material.dart';
import '../models/quest.dart';

class DialogueOverlay extends StatelessWidget {
  final Quest quest;
  final VoidCallback onAcceptQuest;
  final VoidCallback onClaimReward;
  final VoidCallback onClose;

  const DialogueOverlay({
    super.key,
    required this.quest,
    required this.onAcceptQuest,
    required this.onClaimReward,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    String dialogueText;
    List<Widget> actionButtons = [];

    if (!quest.isAccepted) {
      dialogueText =
          'Salam petualang! Waspadalah, ada Warrior Marauder bersenjata pedang besar berkeliaran di area reruntuhan Rumah Tua di utara desa. Tolong kalahkan dia demi keselamatan penduduk desa!';
      actionButtons = [
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFF59E0B),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          ),
          onPressed: onAcceptQuest,
          child: const Text('Terima Quest',
              style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 8),
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Colors.white38),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          ),
          onPressed: onClose,
          child: const Text('Nanti Dulu', style: TextStyle(color: Colors.white70)),
        ),
      ];
    } else if (!quest.isCompleted) {
      dialogueText =
          'Warrior Marauder itu masih menduduki Rumah Tua. Gunakan tombol [GULIR] untuk menghindari tebasan pedangnya dan serang saat ada celah!';
      actionButtons = [
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF3B82F6),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          ),
          onPressed: onClose,
          child: const Text('Saya Akan Menumpasnya!',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ];
    } else if (!quest.isClaimed) {
      dialogueText =
          'Luar biasa! Kamu berhasil menumpas Marauder itu! Sesuai janjiku, terimalah hadiah 100 XP, 50 Gold, dan Pedang Kesatria Kerajaan yang legendaris!';
      actionButtons = [
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          ),
          onPressed: onClaimReward,
          child: const Text('Klaim Hadiah ⚜️',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ];
    } else {
      dialogueText =
          'Terima kasih banyak, Kesatria! Desa Wildlands kini tenteram berkat jasamu. Teruslah berlatih dan jelajahi dunia!';
      actionButtons = [
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Colors.white38),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          ),
          onPressed: onClose,
          child: const Text('Tutup', style: TextStyle(color: Colors.white70)),
        ),
      ];
    }

    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(16),
        constraints: const BoxConstraints(maxWidth: 620),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A).withOpacity(0.95),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF59E0B), width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.6),
              blurRadius: 16,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // NPC Avatar
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFF59E0B), width: 2),
                gradient: const LinearGradient(
                  colors: [Color(0xFF64748B), Color(0xFF334155)],
                ),
              ),
              child: const Center(
                child: Text('🛡️', style: TextStyle(fontSize: 28)),
              ),
            ),
            const SizedBox(width: 14),

            // Text and actions
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Penjaga Rian',
                            style: TextStyle(
                              color: Color(0xFFFDE047),
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Pengawal Gerbang Desa Wildlands',
                            style: TextStyle(color: Colors.white54, fontSize: 11),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white70, size: 20),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: onClose,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    dialogueText,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: actionButtons,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
