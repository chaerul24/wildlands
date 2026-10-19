import 'dart:math';
import 'package:flutter/material.dart';
import '../models/rpg_item.dart';

class Vector3D {
  double x;
  double y;
  double z;

  Vector3D(this.x, this.y, this.z);

  double distanceTo(Vector3D other) {
    final dx = x - other.x;
    final dy = y - other.y;
    final dz = z - other.z;
    return sqrt(dx * dx + dy * dy + dz * dz);
  }

  double horizontalDistanceTo(Vector3D other) {
    final dx = x - other.x;
    final dz = z - other.z;
    return sqrt(dx * dx + dz * dz);
  }
}

enum PlayerState { idle, walk, run, attack, roll, hurt, dead }

class PlayerEntity {
  Vector3D pos = Vector3D(0, 0, 0);
  double rotationY = 0.0; // Angle facing in radians
  PlayerState state = PlayerState.idle;
  double animTimer = 0.0;
  int attackCombo = 1;
  double rollTimer = 0.0;
  bool isInvulnerable = false;

  void reset(double startX, double startZ) {
    pos = Vector3D(startX, 0, startZ);
    rotationY = 0.0;
    state = PlayerState.idle;
    animTimer = 0.0;
    attackCombo = 1;
    rollTimer = 0.0;
    isInvulnerable = false;
  }
}

enum EnemyState { idle, patrol, chase, windup, attack, hurt, dead }

class EnemyEntity {
  final String id;
  final String name;
  Vector3D pos;
  double rotationY = 0.0;
  EnemyState state = EnemyState.idle;
  double hp = 120.0;
  final double maxHp = 120.0;
  final double attackPower = 18.0;
  final double aggroRadius = 14.0;
  final double attackRange = 2.4;

  double stateTimer = 0.0;
  double attackCooldown = 0.0;
  double hurtTimer = 0.0;
  double deathTimer = 0.0;
  Vector3D spawnPos;
  Vector3D patrolTarget;

  EnemyEntity({
    required this.id,
    required this.name,
    required double startX,
    required double startZ,
  })  : pos = Vector3D(startX, 0, startZ),
        spawnPos = Vector3D(startX, 0, startZ),
        patrolTarget = Vector3D(startX, 0, startZ);

  void respawn() {
    pos = Vector3D(spawnPos.x, 0, spawnPos.z);
    hp = maxHp;
    state = EnemyState.idle;
    stateTimer = 0.0;
    attackCooldown = 0.0;
    hurtTimer = 0.0;
    deathTimer = 0.0;
  }
}

class NPCEntity {
  final String id;
  final String name;
  final String title;
  Vector3D pos;
  double rotationY;

  NPCEntity({
    required this.id,
    required this.name,
    required this.title,
    required double x,
    required double z,
    this.rotationY = 0.0,
  }) : pos = Vector3D(x, 0, z);
}

class LootBeaconEntity {
  final String id;
  Vector3D pos;
  final RPGItem item;
  double rotation = 0.0;
  double bobTimer = 0.0;
  bool collected = false;

  LootBeaconEntity({
    required this.id,
    required double x,
    required double z,
    required this.item,
  }) : pos = Vector3D(x, 0, z);
}

class FloatingDamageText {
  Vector3D pos;
  final String text;
  final Color color;
  final bool isCrit;
  double life = 1.0; // 1.0 down to 0.0

  FloatingDamageText({
    required this.pos,
    required this.text,
    required this.color,
    this.isCrit = false,
  });
}

enum SceneryType { tree, rock, ruinWall, ruinPillar, torch }

class SceneryEntity {
  final SceneryType type;
  final Vector3D pos;
  final double scale;
  final double rotation;

  SceneryEntity({
    required this.type,
    required double x,
    required double z,
    this.scale = 1.0,
    this.rotation = 0.0,
  }) : pos = Vector3D(x, 0, z);
}
