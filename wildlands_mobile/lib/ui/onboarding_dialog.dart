import 'package:flutter/material.dart';

class OnboardingDialog extends StatelessWidget {
  final VoidCallback onStartGame;

  const OnboardingDialog({super.key, required this.onStartGame});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 520,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF59E0B), width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.amber.withOpacity(0.3),
              blurRadius: 20,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Text('⚔️', style: TextStyle(fontSize: 28)),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'WILDLANDS RPG — MOBILE EDITION',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    Text(
                      'Panduan Kontrol Layar Sentuh & Mode Offline',
                      style: TextStyle(color: Color(0xFFFDE047), fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
            const Divider(color: Colors.white24, height: 20),
            _buildGuideRow(
              icon: Icons.navigation,
              color: const Color(0xFF38BDF8),
              title: 'Joystick Analog (Kiri Bawah)',
              desc: 'Sentuh dan geser ke segala arah untuk menggerakkan kesatria.',
            ),
            _buildGuideRow(
              icon: Icons.sports_kabaddi,
              color: const Color(0xFFEF4444),
              title: 'Tombol Serang (Merah)',
              desc: 'Tebaskan pedang ke arah musuh. Serangan beruntun memicu kombo.',
            ),
            _buildGuideRow(
              icon: Icons.directions_run,
              color: const Color(0xFF0EA5E9),
              title: 'Tombol Gulir / Menghindar (Biru)',
              desc: 'Meluncur cepat menghindari serangan dengan kebal sesaat (i-frames).',
            ),
            _buildGuideRow(
              icon: Icons.backpack,
              color: const Color(0xFF10B981),
              title: 'Tas Petualang (16 Slot)',
              desc: 'Buka inventori untuk pasang pedang baru atau minum ramuan HP/Stamina.',
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: onStartGame,
                child: const Text(
                  'MULAI PETUALANGAN',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGuideRow({
    required IconData icon,
    required Color color,
    required String title,
    required String desc,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                Text(
                  desc,
                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
