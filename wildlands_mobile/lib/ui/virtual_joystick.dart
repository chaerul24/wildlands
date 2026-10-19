import 'dart:math';
import 'package:flutter/material.dart';

class VirtualJoystick extends StatefulWidget {
  final Function(double angle, double magnitude) onDirectionChanged;
  final VoidCallback onReleased;
  final double radius;

  const VirtualJoystick({
    super.key,
    required this.onDirectionChanged,
    required this.onReleased,
    this.radius = 70.0,
  });

  @override
  State<VirtualJoystick> createState() => _VirtualJoystickState();
}

class _VirtualJoystickState extends State<VirtualJoystick> {
  Offset _dragPosition = Offset.zero;

  void _updatePosition(Offset localPos) {
    final center = Offset(widget.radius, widget.radius);
    final delta = localPos - center;
    final dist = delta.distance;

    final maxDist = widget.radius;
    final clampedDist = min(dist, maxDist);

    final angle = atan2(delta.dy, delta.dx);
    final magnitude = clampedDist / maxDist;

    setState(() {
      _dragPosition = Offset(
        cos(angle) * clampedDist,
        sin(angle) * clampedDist,
      );
    });

    widget.onDirectionChanged(angle, magnitude);
  }

  void _onPanEnd() {
    setState(() {
      _dragPosition = Offset.zero;
    });
    widget.onReleased();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanStart: (details) => _updatePosition(details.localPosition),
      onPanUpdate: (details) => _updatePosition(details.localPosition),
      onPanEnd: (_) => _onPanEnd(),
      onPanCancel: () => _onPanEnd(),
      child: Container(
        width: widget.radius * 2,
        height: widget.radius * 2,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.black.withOpacity(0.35),
          border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Inner center thumb
            Transform.translate(
              offset: _dragPosition,
              child: Container(
                width: widget.radius * 0.8,
                height: widget.radius * 0.8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const RadialGradient(
                    colors: [Color(0xFF60A5FA), Color(0xFF2563EB)],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blueAccent.withOpacity(0.5),
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(Icons.navigation, color: Colors.white, size: 22),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
