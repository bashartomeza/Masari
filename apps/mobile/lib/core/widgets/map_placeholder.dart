import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/app_tokens.dart';
import '../theme/semantic_colors.dart';

/// Stands in for the live map until a real map layer exists.
///
/// The project has no GPS/map package, so this reserves the map's footprint and
/// surfaces whatever location data the API already returns. When a map package
/// is adopted, replacing the body of this widget updates every screen at once —
/// callers do not need to change.
///
/// It never invents a position: with no coordinates it renders an explicit
/// "no location yet" state instead of a decorative fake map.
class MapPlaceholder extends StatelessWidget {
  const MapPlaceholder({
    required this.emptyLabel,
    this.latitude,
    this.longitude,
    this.caption,
    this.staleLabel,
    this.isStale = false,
    this.height = 200,
    this.overlay,
    super.key,
  });

  /// Shown when no coordinates are available — already localised.
  final String emptyLabel;

  /// Latest known position, if the API has reported one.
  final String? latitude;
  final String? longitude;

  /// Optional line under the coordinates, e.g. a recorded-at time.
  final String? caption;

  /// Shown when [isStale] — already localised.
  final String? staleLabel;

  /// Whether the last fix is too old to be trusted.
  final bool isStale;

  final double height;

  /// Content pinned to the bottom of the map area, e.g. a driver card.
  final Widget? overlay;

  bool get _hasFix => latitude != null && longitude != null;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppTokens.radiusLarge),
      child: Container(
        height: height,
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppTheme.surfaceContainer,
          border: Border.all(color: AppTheme.outlineVariant),
          borderRadius: BorderRadius.circular(AppTokens.radiusLarge),
        ),
        child: Stack(
          children: [
            // A neutral grid suggesting a map surface without imitating one.
            Positioned.fill(
              child: CustomPaint(painter: _GridPainter()),
            ),
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.all(AppTokens.spaceMedium),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _hasFix ? Icons.place_outlined : Icons.map_outlined,
                      size: 32,
                      color: _hasFix
                          ? SemanticColors.driver
                          : AppTheme.outline,
                    ),
                    const SizedBox(height: AppTokens.spaceSmall),
                    if (_hasFix) ...[
                      // Latin digits: coordinates are figures, per the design
                      // system's guidance on numeric data.
                      Directionality(
                        textDirection: TextDirection.ltr,
                        child: Text(
                          '$latitude, $longitude',
                          style: theme.textTheme.titleSmall,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (caption != null)
                        Text(
                          caption!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppTheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      if (isStale && staleLabel != null) ...[
                        const SizedBox(height: AppTokens.spaceExtraSmall),
                        Text(
                          staleLabel!,
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: SemanticColors.onWarningContainer,
                          ),
                        ),
                      ],
                    ] else
                      Text(
                        emptyLabel,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppTheme.onSurfaceVariant,
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (overlay != null)
              PositionedDirectional(
                start: AppTokens.spaceSmall,
                end: AppTokens.spaceSmall,
                bottom: AppTokens.spaceSmall,
                child: overlay!,
              ),
          ],
        ),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.outlineVariant.withValues(alpha: 0.35)
      ..strokeWidth = 1;
    const step = 32.0;
    for (var x = 0.0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (var y = 0.0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) => false;
}
