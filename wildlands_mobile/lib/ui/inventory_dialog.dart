import 'package:flutter/material.dart';
import '../models/rpg_item.dart';

class InventoryDialog extends StatefulWidget {
  final List<RPGItem?> inventory;
  final RPGItem? equippedWeapon;
  final RPGItem? equippedArmor;
  final int totalAttack;
  final int totalDefense;
  final double critChance;
  final int gold;
  final Function(int slotIndex, RPGItem item) onUseItem;
  final Function(RPGItem item) onEquipItem;
  final Function(RPGItem item) onUnequipItem;

  const InventoryDialog({
    super.key,
    required this.inventory,
    required this.equippedWeapon,
    required this.equippedArmor,
    required this.totalAttack,
    required this.totalDefense,
    required this.critChance,
    required this.gold,
    required this.onUseItem,
    required this.onEquipItem,
    required this.onUnequipItem,
  });

  @override
  State<InventoryDialog> createState() => _InventoryDialogState();
}

class _InventoryDialogState extends State<InventoryDialog> {
  int? _selectedSlotIndex;

  Color _getRarityColor(String rarity) {
    switch (rarity.toLowerCase()) {
      case 'uncommon':
        return const Color(0xFF10B981);
      case 'rare':
        return const Color(0xFF38BDF8);
      case 'epic':
        return const Color(0xFFA855F7);
      case 'legendary':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF94A3B8);
    }
  }

  bool _isEquipped(RPGItem item) {
    if (widget.equippedWeapon?.id == item.id) return true;
    if (widget.equippedArmor?.id == item.id) return true;
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final selectedItem = (_selectedSlotIndex != null &&
            _selectedSlotIndex! < widget.inventory.length)
        ? widget.inventory[_selectedSlotIndex!]
        : null;

    return Center(
      child: Container(
        width: 620,
        height: 330,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF3B82F6), width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.blueAccent.withOpacity(0.3),
              blurRadius: 20,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Column(
          children: [
            // Header Bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.backpack, color: Color(0xFF38BDF8), size: 24),
                    const SizedBox(width: 8),
                    const Text(
                      'TAS PETUALANG (16 SLOT)',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFF59E0B)),
                      ),
                      child: Text(
                        '🪙 ${widget.gold} G',
                        style: const TextStyle(
                          color: Color(0xFFFDE047),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white70),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ],
            ),
            const Divider(color: Colors.white24, height: 16),

            // Content: 16-slot Grid on left, Details & Stats on right
            Expanded(
              child: Row(
                children: [
                  // 16-Slot Grid (4x4)
                  SizedBox(
                    width: 270,
                    child: GridView.builder(
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 4,
                        mainAxisSpacing: 6,
                        crossAxisSpacing: 6,
                        childAspectRatio: 1.0,
                      ),
                      itemCount: 16,
                      itemBuilder: (context, index) {
                        final item = index < widget.inventory.length
                            ? widget.inventory[index]
                            : null;
                        final isSelected = (_selectedSlotIndex == index);
                        final isEquipped = item != null && _isEquipped(item);

                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedSlotIndex = index;
                            });
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF1E3A8A)
                                  : const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected
                                    ? Colors.cyanAccent
                                    : (item != null
                                        ? _getRarityColor(item.rarity)
                                        : Colors.white12),
                                width: isSelected ? 2.0 : 1.2,
                              ),
                            ),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                if (item != null) ...[
                                  Text(
                                    item.icon,
                                    style: const TextStyle(fontSize: 24),
                                  ),
                                  if (item.count > 1)
                                    Positioned(
                                      bottom: 2,
                                      right: 4,
                                      child: Text(
                                        'x${item.count}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          shadows: [
                                            Shadow(
                                              blurRadius: 3,
                                              color: Colors.black,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  if (isEquipped)
                                    Positioned(
                                      top: 2,
                                      left: 2,
                                      child: Container(
                                        padding: const EdgeInsets.all(2),
                                        decoration: const BoxDecoration(
                                          color: Color(0xFF10B981),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.check,
                                          size: 8,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  const VerticalDivider(color: Colors.white24, width: 20),

                  // Detail & Stat Panel
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Selected Item Details or Placeholder
                        Expanded(
                          child: selectedItem != null
                              ? _buildItemDetails(selectedItem)
                              : _buildStatsSummary(),
                        ),

                        // Action Buttons at bottom
                        if (selectedItem != null)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (selectedItem.type == 'consumable')
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 8),
                                  ),
                                  onPressed: () {
                                    widget.onUseItem(
                                        _selectedSlotIndex!, selectedItem);
                                    setState(() {});
                                  },
                                  child: const Text('Gunakan',
                                      style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold)),
                                ),
                              if (selectedItem.type == 'weapon' ||
                                  selectedItem.type == 'armor')
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: _isEquipped(selectedItem)
                                        ? const Color(0xFFEF4444)
                                        : const Color(0xFF3B82F6),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 8),
                                  ),
                                  onPressed: () {
                                    if (_isEquipped(selectedItem)) {
                                      widget.onUnequipItem(selectedItem);
                                    } else {
                                      widget.onEquipItem(selectedItem);
                                    }
                                    setState(() {});
                                  },
                                  child: Text(
                                    _isEquipped(selectedItem)
                                        ? 'Lepas'
                                        : 'Pasang',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold),
                                  ),
                                ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildItemDetails(RPGItem item) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(item.icon, style: const TextStyle(fontSize: 22)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                item.name,
                style: TextStyle(
                  color: _getRarityColor(item.rarity),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Kategori: ${item.category} (${item.rarity.toUpperCase()})',
          style: const TextStyle(color: Colors.white60, fontSize: 11),
        ),
        const SizedBox(height: 6),
        Text(
          item.description,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
        const SizedBox(height: 8),
        // Stat badges
        Wrap(
          spacing: 6,
          children: [
            if (item.attack > 0)
              _buildStatPill('ATK +${item.attack}', const Color(0xFFEF4444)),
            if (item.critChance > 0)
              _buildStatPill('CRIT +${(item.critChance * 100).toInt()}%',
                  const Color(0xFFF59E0B)),
            if (item.defense > 0)
              _buildStatPill('DEF +${item.defense}', const Color(0xFF3B82F6)),
            if (item.healHp > 0)
              _buildStatPill('HP +${item.healHp}', const Color(0xFF10B981)),
            if (item.restoreSta > 0)
              _buildStatPill('STA +${item.restoreSta}', const Color(0xFF0EA5E9)),
          ],
        ),
      ],
    );
  }

  Widget _buildStatsSummary() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'STATUS TEMPUR KARAKTER',
          style: TextStyle(
            color: Color(0xFF38BDF8),
            fontSize: 13,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        _buildStatRow('Total Serangan (ATK)', '${widget.totalAttack}',
            Icons.sports_kabaddi, const Color(0xFFEF4444)),
        _buildStatRow('Total Pertahanan (DEF)', '${widget.totalDefense}',
            Icons.shield, const Color(0xFF3B82F6)),
        _buildStatRow('Peluang Kritis',
            '${(widget.critChance * 100).toInt()}%', Icons.flash_on,
            const Color(0xFFF59E0B)),
        const SizedBox(height: 6),
        const Text(
          'Pilih item di sebelah kiri untuk melihat detail atau memasang perlengkapan.',
          style: TextStyle(color: Colors.white38, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildStatRow(
      String label, String value, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 14),
              const SizedBox(width: 6),
              Text(label,
                  style: const TextStyle(color: Colors.white70, fontSize: 11)),
            ],
          ),
          Text(
            value,
            style: TextStyle(
                color: color, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildStatPill(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color, width: 1),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
