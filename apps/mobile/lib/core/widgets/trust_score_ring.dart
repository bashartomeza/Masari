import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/app_tokens.dart';
import '../theme/semantic_colors.dart';

/// A radial gauge for a driver or merchant trust score.
///
/// The arc colour moves along the success-to-error spectrum with the score, so
/// a weak score is legible at a glance without reading the number.
///
/// The numeric value uses Latin digits: the design system specifies English
/// glyphs for figures so they stay unambiguous in logistics contexts.
class TrustScoreRing extends StatelessWidget {
  const TrustScoreRing({
    required this.score,
    required this.label,
    this.caption,
    this.maxScore = 5.0,
    this.size = 96,
    super.key,
  });

  /// The score to display, in the range 0..[maxScore].
  final double score;

  /// Caption above the gauge, e.g. "Trust score" — already localised.
  final String label;

  /// Optional qualitative caption under the number, e.g. "Excellent".
  final String? caption;

  final double maxScore;
  final double size;

  double get _fraction => (score / maxScore).clamp(0.0, 1.0);

  Color get _arcColor {
    final f = _fraction;
    if (f >= 0.8) return SemanticColors.success;
    if (f >= 0.6) return SemanticColors.action;
    if (f >= 0.4) return SemanticColors.warning;
    return SemanticColors.error;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: AppTheme.onSurfaceVariant,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: AppTokens.spaceSmall),
        SizedBox(
          width: size,
          height: size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              SizedBox.expand(
                child: CircularProgressIndicator(
                  value: _fraction,
                  strokeWidth: 8,
                  strokeCap: StrokeCap.round,
                  backgroundColor: AppTheme.surfaceContainerHigh,
                  valueColor: AlwaysStoppedAnimation(_arcColor),
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    // Latin digits, one decimal place.
                    score.toStringAsFixed(1),
                    style: theme.textTheme.headlineSmall?.copyWith(
                      color: AppTheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (caption != null)
                    Text(
                      caption!,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: _arcColor,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
