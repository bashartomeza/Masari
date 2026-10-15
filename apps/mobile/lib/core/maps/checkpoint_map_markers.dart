import 'package:flutter/material.dart';

import '../../features/canonical_routes/domain/canonical_route_models.dart';
import '../../features/checkpoints/domain/checkpoint_models.dart';
import '../widgets/masari_map.dart';

/// Builds a visually distinct marker for a checkpoint and includes both
/// direction statuses in the information card shown when the marker is tapped.
MasariMapMarker checkpointTrafficMarker(Checkpoint checkpoint) {
  final entering = _normaliseStatus(checkpoint.enteringStatus);
  final leaving = _normaliseStatus(checkpoint.leavingStatus);

  // Use the most severe of the two directions to colour the marker.
  final status = _worstStatus(entering, leaving);

  return MasariMapMarker(
    position: GeoPoint(
      checkpoint.position.latitude,
      checkpoint.position.longitude,
    ),
    icon: _statusIcon(status),
    color: _statusColor(status),
    foreground: Colors.white,
    size: 40,
    type: MasariMapMarkerType.checkpoint,
    label: _buildLabel(
      checkpoint,
      entering: entering,
      leaving: leaving,
    ),
  );
}

String _buildLabel(
  Checkpoint checkpoint, {
  required String entering,
  required String leaving,
}) {
  final name = checkpoint.nameAr.trim().isNotEmpty
      ? checkpoint.nameAr.trim()
      : 'حاجز';
  final city = checkpoint.city.trim();
  return [
    name,
    if (city.isNotEmpty) city,
    'دخول: $entering',
    'خروج: $leaving',
  ].join('\n');
}

String _normaliseStatus(String? status) {
  final value = status?.trim();
  return value == null || value.isEmpty ? 'غير معروف' : value;
}

String _worstStatus(String entering, String leaving) {
  if (entering == 'أزمة' || leaving == 'أزمة') return 'أزمة';
  if (entering == 'أزمة متوسطة' || leaving == 'أزمة متوسطة') {
    return 'أزمة متوسطة';
  }
  if (entering == 'سالك' || leaving == 'سالك') return 'سالك';
  return 'غير معروف';
}

IconData _statusIcon(String status) {
  switch (status) {
    case 'سالك':
      return Icons.directions_car_rounded;
    case 'أزمة متوسطة':
      return Icons.traffic_rounded;
    case 'أزمة':
      return Icons.car_crash_rounded;
    default:
      return Icons.signpost_rounded;
  }
}

Color _statusColor(String status) {
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
