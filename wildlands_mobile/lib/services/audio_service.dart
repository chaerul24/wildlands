import 'package:flutter/services.dart';

class AudioService {
  static void playAttack() {
    HapticFeedback.lightImpact();
  }

  static void playHit() {
    HapticFeedback.mediumImpact();
  }

  static void playCritHit() {
    HapticFeedback.heavyImpact();
  }

  static void playDodge() {
    HapticFeedback.selectionClick();
  }

  static void playLoot() {
    HapticFeedback.mediumImpact();
  }

  static void playLevelUp() {
    HapticFeedback.vibrate();
  }

  static void playPotion() {
    HapticFeedback.lightImpact();
  }
}
