import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/app_tokens.dart';
import '../theme/semantic_colors.dart';

/// The emphasis levels defined by the Masari design system.
enum MasariButtonVariant {
  /// Deep teal, white text. High emphasis — the main path forward.
  primary,

  /// Warm orange. Reserved for movement: "Start Trip", "Accept",
  /// "Confirm Delivery". Never used for ordinary navigation.
  action,

  /// Teal tint background with teal text. Medium emphasis.
  secondary,

  /// 1.5px teal border on a transparent background. Low emphasis.
  outline,

  /// Error red. Destructive, e.g. "Cancel Trip".
  destructive,
}

/// A button that applies the design system's emphasis levels consistently.
///
/// Handles the states screens keep needing: a busy spinner that preserves the
/// button's height (so layouts don't jump mid-request), an optional leading
/// icon, and full-width by default since most Masari buttons anchor a section.
///
/// Labels come from the caller so localisation stays at the screen level.
class MasariButton extends StatelessWidget {
  const MasariButton({
    required this.label,
    required this.onPressed,
    this.variant = MasariButtonVariant.primary,
    this.icon,
    this.busy = false,
    this.expand = true,
    super.key,
  });

  const MasariButton.action({
    required this.label,
    required this.onPressed,
    this.icon,
    this.busy = false,
    this.expand = true,
    super.key,
  }) : variant = MasariButtonVariant.action;

  const MasariButton.secondary({
    required this.label,
    required this.onPressed,
    this.icon,
    this.busy = false,
    this.expand = true,
    super.key,
  }) : variant = MasariButtonVariant.secondary;

  const MasariButton.outline({
    required this.label,
    required this.onPressed,
    this.icon,
    this.busy = false,
    this.expand = true,
    super.key,
  }) : variant = MasariButtonVariant.outline;

  const MasariButton.destructive({
    required this.label,
    required this.onPressed,
    this.icon,
    this.busy = false,
    this.expand = true,
    super.key,
  }) : variant = MasariButtonVariant.destructive;

  final String label;

  /// `null` disables the button. While [busy] the press handler is suppressed
  /// regardless, so a slow request cannot be submitted twice.
  final VoidCallback? onPressed;

  final MasariButtonVariant variant;
  final IconData? icon;
  final bool busy;

  /// Whether the button stretches to the full width of its parent.
  final bool expand;

  ({Color background, Color foreground, BorderSide? border}) get _palette =>
      switch (variant) {
        MasariButtonVariant.primary => (
          background: AppTheme.primary,
          foreground: AppTheme.onPrimary,
          border: null,
        ),
        MasariButtonVariant.action => (
          background: SemanticColors.action,
          foreground: SemanticColors.onAction,
          border: null,
        ),
        MasariButtonVariant.secondary => (
          background: AppTheme.secondaryContainer,
          foreground: AppTheme.onSecondaryContainer,
          border: null,
        ),
        MasariButtonVariant.outline => (
          background: Colors.transparent,
          foreground: AppTheme.primary,
          border: const BorderSide(color: AppTheme.primary, width: 1.5),
        ),
        MasariButtonVariant.destructive => (
          background: SemanticColors.errorContainer,
          foreground: SemanticColors.onErrorContainer,
          border: null,
        ),
      };

  @override
  Widget build(BuildContext context) {
    final palette = _palette;
    final enabled = onPressed != null && !busy;

    final child = busy
        ? SizedBox(
            height: AppTokens.spaceLarge - AppTokens.spaceExtraSmall,
            width: AppTokens.spaceLarge - AppTokens.spaceExtraSmall,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(palette.foreground),
            ),
          )
        : Row(
            mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: AppTokens.spaceSmall),
              ],
              // Flexible so long Arabic labels ellipsize instead of overflowing
              // on small screens.
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          );

    final button = FilledButton(
      onPressed: enabled ? onPressed : null,
      style: FilledButton.styleFrom(
        backgroundColor: palette.background,
        foregroundColor: palette.foreground,
        disabledBackgroundColor: variant == MasariButtonVariant.outline
            ? Colors.transparent
            : AppTheme.surfaceContainerHigh,
        disabledForegroundColor: AppTheme.outline,
        side: palette.border,
        elevation: 0,
        minimumSize: Size(expand ? double.infinity : 0, AppTokens.buttonHeight),
        padding: const EdgeInsets.symmetric(horizontal: AppTokens.spaceMedium),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
        ),
        textStyle: const TextStyle(
          fontFamily: AppTheme.fontFamily,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
      child: child,
    );

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}
