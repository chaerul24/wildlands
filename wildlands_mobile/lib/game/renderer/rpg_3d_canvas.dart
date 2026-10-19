import 'dart:math';
import 'package:flutter/material.dart';
import '../world_entity.dart';

class ProjectedPoint {
  final double x;
  final double y;
  final double depth;
  final bool visible;

  ProjectedPoint(this.x, this.y, this.depth, this.visible);
}

class RPG3DCanvas extends CustomPainter {
  final PlayerEntity player;
  final EnemyEntity enemy;
  final NPCEntity npc;
  final List<LootBeaconEntity> lootBeacons;
  final List<FloatingDamageText> damageTexts;
  final List<SceneryEntity> scenery;
  final double cameraYaw;
  final double cameraPitch;
  final double gameTime;

  RPG3DCanvas({
    required this.player,
    required this.enemy,
    required this.npc,
    required this.lootBeacons,
    required this.damageTexts,
    required this.scenery,
    required this.cameraYaw,
    required this.cameraPitch,
    required this.gameTime,
  });

  ProjectedPoint project(Vector3D wp, Size size, Vector3D camPos) {
    // 1. Translate relative to camera
    final dx = wp.x - camPos.x;
    final dy = wp.y - camPos.y;
    final dz = wp.z - camPos.z;

    // 2. Rotate by Yaw
    final cosY = cos(-cameraYaw);
    final sinY = sin(-cameraYaw);
    final x1 = dx * cosY - dz * sinY;
    final z1 = dx * sinY + dz * cosY;

    // 3. Rotate by Pitch
    final cosP = cos(-cameraPitch);
    final sinP = sin(-cameraPitch);
    final y1 = dy * cosP - z1 * sinP;
    final z2 = dy * sinP + z1 * cosP;

    if (z2 < 0.3) {
      return ProjectedPoint(0, 0, z2, false);
    }

    final fov = size.height * 1.15;
    final sx = size.width / 2 + (x1 / z2) * fov;
    final sy = size.height / 2 - (y1 / z2) * fov;

    return ProjectedPoint(sx, sy, z2, true);
  }

  @override
  void paint(Canvas canvas, Size size) {
    // Sky gradient background
    final skyRect = Rect.fromLTWH(0, 0, size.width, size.height);
    final skyPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Color(0xFF1A2A40),
          Color(0xFF2C4A6F),
          Color(0xFF4A6B8A),
          Color(0xFF6B898A),
        ],
      ).createShader(skyRect);
    canvas.drawRect(skyRect, skyPaint);

    // Calculate third-person camera position
    const camDist = 7.5;
    final targetY = player.pos.y + 1.2;
    final camX = player.pos.x - sin(cameraYaw) * cos(cameraPitch) * camDist;
    final camY = targetY + sin(cameraPitch) * camDist;
    final camZ = player.pos.z - cos(cameraYaw) * cos(cameraPitch) * camDist;
    final camPos = Vector3D(camX, camY, camZ);

    // 1. Draw 3D Ground & Pathways
    _drawTerrain(canvas, size, camPos);

    // 2. Collect all renderable 3D objects with depth sorting
    final List<_RenderableItem> items = [];

    // Scenery (Trees, Rocks, Ruins)
    for (final s in scenery) {
      final p = project(s.pos, size, camPos);
      if (p.visible) {
        items.add(_RenderableItem(p.depth, () => _drawScenery(canvas, size, camPos, s, p)));
      }
    }

    // NPC Penjaga Rian
    final npcProj = project(npc.pos, size, camPos);
    if (npcProj.visible) {
      items.add(_RenderableItem(npcProj.depth, () => _drawNPC(canvas, size, camPos, npcProj)));
    }

    // Enemy Warrior Marauder
    final enemyProj = project(enemy.pos, size, camPos);
    if (enemyProj.visible) {
      items.add(_RenderableItem(enemyProj.depth, () => _drawEnemy(canvas, size, camPos, enemyProj)));
    }

    // 3D Loot Beacons
    for (final loot in lootBeacons) {
      if (!loot.collected) {
        final lp = project(loot.pos, size, camPos);
        if (lp.visible) {
          items.add(_RenderableItem(lp.depth, () => _drawLootBeacon(canvas, size, camPos, loot, lp)));
        }
      }
    }

    // Player
    final playerProj = project(player.pos, size, camPos);
    if (playerProj.visible) {
      items.add(_RenderableItem(playerProj.depth, () => _drawPlayer(canvas, size, camPos, playerProj)));
    }

    // Sort far to near (Painter's algorithm)
    items.sort((a, b) => b.depth.compareTo(a.depth));

    for (final item in items) {
      item.render();
    }

    // Draw 3D Floating Damage Numbers (always on top of 3D geometry)
    _drawDamageTexts(canvas, size, camPos);
  }

  void _drawTerrain(Canvas canvas, Size size, Vector3D camPos) {
    final gridPaint = Paint()
      ..color = const Color(0xFF2A5228)
      ..style = PaintingStyle.fill;

    final linePaint = Paint()
      ..color = const Color(0xFF386636)
      ..strokeWidth = 1.0;

    final pathPaint = Paint()
      ..color = const Color(0xFF6E5E4E)
      ..style = PaintingStyle.fill;

    // Draw ground grid patches
    const int range = 18;
    const double step = 2.5;

    final baseCenter = Vector3D(
      (player.pos.x / step).round() * step,
      0,
      (player.pos.z / step).round() * step,
    );

    for (int x = -range; x <= range; x += 2) {
      for (int z = -range; z <= range; z += 2) {
        final gx = baseCenter.x + x * step;
        final gz = baseCenter.z + z * step;

        // Check if this tile is the village road
        final bool isRoad = (gx.abs() <= 3.0 && gz >= -15 && gz <= 40);

        final p1 = project(Vector3D(gx, 0, gz), size, camPos);
        final p2 = project(Vector3D(gx + step * 2, 0, gz), size, camPos);
        final p3 = project(Vector3D(gx + step * 2, 0, gz + step * 2), size, camPos);
        final p4 = project(Vector3D(gx, 0, gz + step * 2), size, camPos);

        if (p1.visible && p2.visible && p3.visible && p4.visible) {
          final poly = Path()
            ..moveTo(p1.x, p1.y)
            ..lineTo(p2.x, p2.y)
            ..lineTo(p3.x, p3.y)
            ..lineTo(p4.x, p4.y)
            ..close();

          canvas.drawPath(poly, isRoad ? pathPaint : gridPaint);
          canvas.drawPath(poly, linePaint);
        }
      }
    }
  }

  void _drawPlayer(Canvas canvas, Size size, Vector3D camPos, ProjectedPoint p) {
    final scale = (1.0 / p.depth) * 550.0;
    final cx = p.x;
    final cy = p.y;

    // Shadow
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy), width: scale * 0.7, height: scale * 0.3),
      Paint()..color = Colors.black.withOpacity(0.4),
    );

    // Bobbing animation when moving
    double bob = 0.0;
    if (player.state == PlayerState.walk || player.state == PlayerState.run) {
      bob = sin(gameTime * 14.0) * (scale * 0.08);
    }

    final bodyY = cy - scale * 0.8 + bob;

    // Draw Legs
    final legPaint = Paint()..color = const Color(0xFF2C3E50);
    final legSwing = (player.state == PlayerState.walk || player.state == PlayerState.run)
        ? sin(gameTime * 14.0) * (scale * 0.15)
        : 0.0;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cx - scale * 0.22, cy - scale * 0.5 + legSwing, scale * 0.16, scale * 0.5),
        const Radius.circular(3),
      ),
      legPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cx + scale * 0.06, cy - scale * 0.5 - legSwing, scale * 0.16, scale * 0.5),
        const Radius.circular(3),
      ),
      legPaint,
    );

    // Draw Torso & Armor
    final armorPaint = Paint()..color = const Color(0xFF4A6984);
    final tabardPaint = Paint()..color = const Color(0xFF1E3A8A); // Royal Blue

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, bodyY), width: scale * 0.44, height: scale * 0.6),
        const Radius.circular(4),
      ),
      armorPaint,
    );
    canvas.drawRect(
      Rect.fromCenter(center: Offset(cx, bodyY), width: scale * 0.2, height: scale * 0.6),
      tabardPaint,
    );

    // Draw Head & Knight Helm
    final helmPaint = Paint()..color = const Color(0xFF94A3B8);
    final visorPaint = Paint()..color = const Color(0xFFF59E0B); // Golden visor slit
    final headY = bodyY - scale * 0.45;

    canvas.drawCircle(Offset(cx, headY), scale * 0.2, helmPaint);
    canvas.drawRect(
      Rect.fromCenter(center: Offset(cx, headY), width: scale * 0.22, height: scale * 0.06),
      visorPaint,
    );

    // Left Arm + Shield
    final shieldPaint = Paint()..color = const Color(0xFF1E3A8A);
    final rimPaint = Paint()
      ..color = const Color(0xFFF59E0B)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final shieldRect = Rect.fromCenter(
      center: Offset(cx - scale * 0.32, bodyY + scale * 0.05),
      width: scale * 0.26,
      height: scale * 0.45,
    );
    canvas.drawRRect(RRect.fromRectAndRadius(shieldRect, const Radius.circular(6)), shieldPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(shieldRect, const Radius.circular(6)), rimPaint);

    // Right Arm + Sword
    final swordBlade = Paint()..color = const Color(0xFFE2E8F0);
    final swordHilt = Paint()..color = const Color(0xFFD97706);

    double swordAngle = -0.4;
    double slashProgress = 0.0;

    if (player.state == PlayerState.attack) {
      slashProgress = player.animTimer; // 0 to 1
      swordAngle = -0.6 + slashProgress * 2.2;

      // Draw dynamic attack slash arc
      final arcPaint = Paint()
        ..color = const Color(0xFF38BDF8).withOpacity((1.0 - slashProgress) * 0.8)
        ..style = PaintingStyle.stroke
        ..strokeWidth = scale * 0.12
        ..strokeCap = StrokeCap.round;

      final arcRect = Rect.fromCircle(center: Offset(cx, bodyY), radius: scale * 0.9);
      canvas.drawArc(arcRect, -0.6, 1.8, false, arcPaint);
    }

    final hiltX = cx + scale * 0.3;
    final hiltY = bodyY;
    final tipX = hiltX + cos(swordAngle) * (scale * 0.7);
    final tipY = hiltY + sin(swordAngle) * (scale * 0.7);

    canvas.drawLine(Offset(hiltX, hiltY), Offset(tipX, tipY), swordBlade..strokeWidth = scale * 0.08);
    canvas.drawCircle(Offset(hiltX, hiltY), scale * 0.07, swordHilt);

    // If Rolling: Draw speed streak
    if (player.state == PlayerState.roll) {
      final rollPaint = Paint()
        ..color = Colors.white.withOpacity(0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = scale * 0.06;
      canvas.drawCircle(Offset(cx, bodyY), scale * 0.6, rollPaint);
    }
  }

  void _drawEnemy(Canvas canvas, Size size, Vector3D camPos, ProjectedPoint p) {
    final scale = (1.0 / p.depth) * 550.0;
    final cx = p.x;
    final cy = p.y;

    if (enemy.state == EnemyState.dead) {
      // Dissolve particles on death
      final deadPaint = Paint()..color = const Color(0xFFDC2626).withOpacity(0.4);
      canvas.drawCircle(Offset(cx, cy), scale * 0.4, deadPaint);
      return;
    }

    // Shadow
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy), width: scale * 0.9, height: scale * 0.35),
      Paint()..color = Colors.black.withOpacity(0.5),
    );

    // Attack Telegraph Circle on Ground (Windup)
    if (enemy.state == EnemyState.windup) {
      final pulse = (sin(gameTime * 18.0) * 0.2 + 0.8);
      final telePaint = Paint()
        ..color = const Color(0xFFEF4444).withOpacity(0.5 * pulse)
        ..style = PaintingStyle.fill;
      final teleBorder = Paint()
        ..color = const Color(0xFFDC2626)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.0;

      final teleRect = Rect.fromCenter(
        center: Offset(cx, cy),
        width: scale * 1.8,
        height: scale * 0.7,
      );
      canvas.drawOval(teleRect, telePaint);
      canvas.drawOval(teleRect, teleBorder);
    }

    // Flashing when Hurt
    final bool isHurt = enemy.hurtTimer > 0;
    final bodyPaint = Paint()
      ..color = isHurt ? Colors.white : const Color(0xFF831843); // Dark red/orc armor
    final hornPaint = Paint()..color = const Color(0xFFFACC15);

    final bodyY = cy - scale * 0.9;

    // Body
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, bodyY), width: scale * 0.55, height: scale * 0.75),
        const Radius.circular(5),
      ),
      bodyPaint,
    );

    // Marauder Horns
    canvas.drawCircle(Offset(cx - scale * 0.25, bodyY - scale * 0.4), scale * 0.12, hornPaint);
    canvas.drawCircle(Offset(cx + scale * 0.25, bodyY - scale * 0.4), scale * 0.12, hornPaint);

    // Glowing Red Eyes
    final eyePaint = Paint()..color = const Color(0xFFEF4444);
    canvas.drawCircle(Offset(cx - scale * 0.1, bodyY - scale * 0.25), scale * 0.04, eyePaint);
    canvas.drawCircle(Offset(cx + scale * 0.1, bodyY - scale * 0.25), scale * 0.04, eyePaint);

    // Greatsword
    final swordPaint = Paint()
      ..color = const Color(0xFF475569)
      ..strokeWidth = scale * 0.12
      ..strokeCap = StrokeCap.round;

    final swingY = (enemy.state == EnemyState.attack) ? bodyY + scale * 0.4 : bodyY - scale * 0.3;
    canvas.drawLine(
      Offset(cx + scale * 0.35, bodyY),
      Offset(cx + scale * 0.65, swingY),
      swordPaint,
    );

    // Overhead Boss/Enemy HP Bar
    final barW = scale * 1.2;
    final barH = scale * 0.12;
    final barX = cx - barW / 2;
    final barY = bodyY - scale * 0.75;

    // Background
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(barX, barY, barW, barH), const Radius.circular(2)),
      Paint()..color = Colors.black87,
    );

    // Fill
    final hpRatio = (enemy.hp / enemy.maxHp).clamp(0.0, 1.0);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(barX + 1, barY + 1, (barW - 2) * hpRatio, barH - 2),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFFEF4444),
    );

    // Name label
    final textSpan = TextSpan(
      text: enemy.name,
      style: TextStyle(
        color: Colors.white,
        fontSize: (scale * 0.16).clamp(10.0, 16.0),
        fontWeight: FontWeight.bold,
        shadows: const [Shadow(blurRadius: 4, color: Colors.black)],
      ),
    );
    final tp = TextPainter(text: textSpan, textDirection: TextDirection.ltr)..layout();
    tp.paint(canvas, Offset(cx - tp.width / 2, barY - tp.height - 2));
  }

  void _drawNPC(Canvas canvas, Size size, Vector3D camPos, ProjectedPoint p) {
    final scale = (1.0 / p.depth) * 550.0;
    final cx = p.x;
    final cy = p.y;

    // Shadow
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy), width: scale * 0.7, height: scale * 0.3),
      Paint()..color = Colors.black.withOpacity(0.4),
    );

    final bodyY = cy - scale * 0.8;

    // Guard Armor (Silver & Gold)
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, bodyY), width: scale * 0.42, height: scale * 0.65),
        const Radius.circular(4),
      ),
      Paint()..color = const Color(0xFF64748B),
    );

    // Guard Spear
    canvas.drawLine(
      Offset(cx + scale * 0.28, cy),
      Offset(cx + scale * 0.28, bodyY - scale * 0.8),
      Paint()
        ..color = const Color(0xFFE2E8F0)
        ..strokeWidth = scale * 0.05,
    );
    canvas.drawCircle(Offset(cx + scale * 0.28, bodyY - scale * 0.82), scale * 0.07, Paint()..color = const Color(0xFFF59E0B));

    // Floating Quest Indicator [?] overhead
    final bob = sin(gameTime * 4.0) * (scale * 0.08);
    final questY = bodyY - scale * 0.75 + bob;

    canvas.drawCircle(Offset(cx, questY), scale * 0.2, Paint()..color = const Color(0xFFF59E0B));
    final questSpan = TextSpan(
      text: '?',
      style: TextStyle(
        color: Colors.black,
        fontSize: (scale * 0.26).clamp(12.0, 22.0),
        fontWeight: FontWeight.w900,
      ),
    );
    final qp = TextPainter(text: questSpan, textDirection: TextDirection.ltr)..layout();
    qp.paint(canvas, Offset(cx - qp.width / 2, questY - qp.height / 2));

    // NPC Name
    final nameSpan = TextSpan(
      text: npc.name,
      style: TextStyle(
        color: const Color(0xFFFDE047),
        fontSize: (scale * 0.16).clamp(10.0, 15.0),
        fontWeight: FontWeight.bold,
        shadows: const [Shadow(blurRadius: 4, color: Colors.black)],
      ),
    );
    final np = TextPainter(text: nameSpan, textDirection: TextDirection.ltr)..layout();
    np.paint(canvas, Offset(cx - np.width / 2, questY - np.height - 4));
  }

  void _drawLootBeacon(Canvas canvas, Size size, Vector3D camPos, LootBeaconEntity loot, ProjectedPoint p) {
    final scale = (1.0 / p.depth) * 550.0;
    final cx = p.x;
    final cy = p.y;

    // Glowing ground circle
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy), width: scale * 0.9, height: scale * 0.4),
      Paint()..color = const Color(0xFFF59E0B).withOpacity(0.5),
    );

    // Vertical Golden Light Beam
    final beamRect = Rect.fromLTWH(cx - scale * 0.12, cy - scale * 3.5, scale * 0.24, scale * 3.5);
    final beamPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.bottomCenter,
        end: Alignment.topCenter,
        colors: [
          const Color(0xFFFBBF24).withOpacity(0.8),
          const Color(0xFFFBBF24).withOpacity(0.0),
        ],
      ).createShader(beamRect);
    canvas.drawRect(beamRect, beamPaint);

    // Floating Golden Orb
    final bob = sin(gameTime * 5.0) * (scale * 0.1);
    final orbY = cy - scale * 0.6 + bob;

    canvas.drawCircle(Offset(cx, orbY), scale * 0.18, Paint()..color = const Color(0xFFF59E0B));
    canvas.drawCircle(Offset(cx, orbY), scale * 0.12, Paint()..color = Colors.white);

    // Item Name Popup
    final textSpan = TextSpan(
      text: '${loot.item.icon} ${loot.item.name}',
      style: TextStyle(
        color: Colors.amberAccent,
        fontSize: (scale * 0.15).clamp(10.0, 14.0),
        fontWeight: FontWeight.bold,
        shadows: const [Shadow(blurRadius: 4, color: Colors.black)],
      ),
    );
    final tp = TextPainter(text: textSpan, textDirection: TextDirection.ltr)..layout();
    tp.paint(canvas, Offset(cx - tp.width / 2, orbY - tp.height - scale * 0.2));
  }

  void _drawScenery(Canvas canvas, Size size, Vector3D camPos, SceneryEntity s, ProjectedPoint p) {
    final scale = (1.0 / p.depth) * 550.0 * s.scale;
    final cx = p.x;
    final cy = p.y;

    switch (s.type) {
      case SceneryType.tree:
        // Trunk
        canvas.drawRect(
          Rect.fromLTWH(cx - scale * 0.1, cy - scale * 0.7, scale * 0.2, scale * 0.7),
          Paint()..color = const Color(0xFF451A03),
        );
        // Foliage layers (Pine)
        final foliagePaint = Paint()..color = const Color(0xFF14532D);
        final path = Path()
          ..moveTo(cx, cy - scale * 2.2)
          ..lineTo(cx + scale * 0.7, cy - scale * 1.3)
          ..lineTo(cx + scale * 0.4, cy - scale * 1.3)
          ..lineTo(cx + scale * 0.9, cy - scale * 0.6)
          ..lineTo(cx - scale * 0.9, cy - scale * 0.6)
          ..lineTo(cx - scale * 0.4, cy - scale * 1.3)
          ..lineTo(cx - scale * 0.7, cy - scale * 1.3)
          ..close();
        canvas.drawPath(path, foliagePaint);
        break;

      case SceneryType.rock:
        canvas.drawOval(
          Rect.fromCenter(center: Offset(cx, cy - scale * 0.25), width: scale * 0.8, height: scale * 0.5),
          Paint()..color = const Color(0xFF475569),
        );
        canvas.drawOval(
          Rect.fromCenter(center: Offset(cx - scale * 0.1, cy - scale * 0.3), width: scale * 0.5, height: scale * 0.3),
          Paint()..color = const Color(0xFF64748B),
        );
        break;

      case SceneryType.ruinWall:
        // Stone brick wall of the Old Ruins
        final wallRect = Rect.fromCenter(
          center: Offset(cx, cy - scale * 0.6),
          width: scale * 1.6,
          height: scale * 1.2,
        );
        canvas.drawRect(wallRect, Paint()..color = const Color(0xFF334155));
        canvas.drawRect(
          wallRect,
          Paint()
            ..color = const Color(0xFF1E293B)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.0,
        );
        break;

      case SceneryType.ruinPillar:
        // Broken column
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(cx - scale * 0.2, cy - scale * 1.4, scale * 0.4, scale * 1.4),
            const Radius.circular(4),
          ),
          Paint()..color = const Color(0xFF64748B),
        );
        break;

      case SceneryType.torch:
        // Wall torch with fire
        canvas.drawLine(
          Offset(cx, cy),
          Offset(cx, cy - scale * 0.8),
          Paint()
            ..color = const Color(0xFF78350F)
            ..strokeWidth = scale * 0.08,
        );
        // Fire flicker
        final flicker = sin(gameTime * 20.0) * 0.15;
        canvas.drawCircle(
          Offset(cx, cy - scale * 0.85),
          scale * (0.2 + flicker),
          Paint()..color = const Color(0xFFF97316),
        );
        canvas.drawCircle(
          Offset(cx, cy - scale * 0.85),
          scale * (0.1 + flicker),
          Paint()..color = const Color(0xFFFDE047),
        );
        break;
    }
  }

  void _drawDamageTexts(Canvas canvas, Size size, Vector3D camPos) {
    for (final dt in damageTexts) {
      final p = project(dt.pos, size, camPos);
      if (p.visible) {
        final scale = (1.0 / p.depth) * 550.0;
        final alpha = (dt.life).clamp(0.0, 1.0);

        final textSpan = TextSpan(
          text: dt.text,
          style: TextStyle(
            color: dt.color.withOpacity(alpha),
            fontSize: (dt.isCrit ? scale * 0.35 : scale * 0.25).clamp(12.0, 26.0),
            fontWeight: FontWeight.w900,
            shadows: [
              Shadow(
                blurRadius: 4,
                color: Colors.black.withOpacity(alpha),
                offset: const Offset(1, 1),
              ),
            ],
          ),
        );

        final tp = TextPainter(text: textSpan, textDirection: TextDirection.ltr)..layout();
        tp.paint(canvas, Offset(p.x - tp.width / 2, p.y - tp.height / 2));
      }
    }
  }

  @override
  bool shouldRepaint(covariant RPG3DCanvas oldDelegate) => true;
}

class _RenderableItem {
  final double depth;
  final VoidCallback render;

  _RenderableItem(this.depth, this.render);
}
