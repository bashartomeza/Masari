import 'package:flutter/material.dart';
import 'package:masari_mobile/core/widgets/masari_map.dart';

import '../../features/checkpoints/domain/checkpoint_models.dart';

/// Builds a map marker representing the traffic state of a checkpoint.
///
/// The checkpoint itself contains two independent traffic states:
/// - entering
/// - leaving
///
/// The marker color represents the most severe current state so the
/// checkpoint is immediately visible on the map.
///
/// Tapping the marker shows both directions in the map callout.
MasariMapMarker checkpointTrafficMarker(
  Checkpoint checkpoint,
) {
  final status = _worstStatus(
    checkpoint.enteringStatus,
    checkpoint.leavingStatus,
  );

  return MasariMapMarker(
    position: checkpoint.position,
    icon: _statusIcon(status),
    color: _statusColor(status),
    foreground: Colors.white,
    size: 38,
    type: MasariMapMarkerType.checkpoint,
    label: _buildLabel(checkpoint),
  );
}

/// Returns the most severe status available.
///
/// Priority:
/// 1. أزمة
/// 2. أزمة متوسطة
/// 3. سالك
/// 4. Unknown
String? _worstStatus(
  String? entering,
  String? leaving,
) {
  final statuses = <String>[
    if (entering != null && entering.trim().isNotEmpty)
      entering.trim(),
    if (leaving != null && leaving.trim().isNotEmpty)
      leaving.trim(),
  ];

  if (statuses.isEmpty) {
    return null;
  }

  if (statuses.contains('أزمة')) {
    return 'أزمة';
  }

  if (statuses.contains('أزمة متوسطة')) {
    return 'أزمة متوسطة';
  }

  if (statuses.contains('سالك')) {
    return 'سالك';
  }

  return statuses.first;
}

Color _statusColor(String? status) {
  switch (status) {
    case 'سالك':
      return const Color(0xFF16A34A);

    case 'أزمة متوسطة':
      return const Color(0xFFF59E0B);

    case 'أزمة':
      return const Color(0xFFDC2626);

    default:
      return const Color(0xFF64748B);
  }
}

IconData _statusIcon(String? status) {
  switch (status) {
    case 'سالك':
      return Icons.check_circle_rounded;

    case 'أزمة متوسطة':
      return Icons.traffic_rounded;

    case 'أزمة':
      return Icons.warning_rounded;

    default:
      return Icons.help_outline_rounded;
  }
}

String _buildLabel(Checkpoint checkpoint) {
  final entering =
      checkpoint.enteringStatus?.trim().isNotEmpty == true
          ? checkpoint.enteringStatus!.trim()
          : 'الحالة غير متوفرة';

  final leaving =
      checkpoint.leavingStatus?.trim().isNotEmpty == true
          ? checkpoint.leavingStatus!.trim()
          : 'الحالة غير متوفرة';

  final parts = <String>[
    if (checkpoint.nameAr.trim().isNotEmpty)
      checkpoint.nameAr.trim(),
    if (checkpoint.city.trim().isNotEmpty)
      checkpoint.city.trim(),
    'دخول: $entering',
    'خروج: $leaving',
  ];

  return parts.join(' • ');
}