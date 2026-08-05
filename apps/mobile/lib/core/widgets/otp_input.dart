import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';
import '../theme/app_tokens.dart';
import '../theme/semantic_colors.dart';

/// Discrete OTP entry boxes.
///
/// The row is forced to LTR even under Arabic: the design system specifies
/// English glyphs for OTP codes, and a code is read left-to-right regardless of
/// page direction. Digits are entered into a single hidden field so paste and
/// SMS autofill deliver the whole code at once.
class OtpInput extends StatefulWidget {
  const OtpInput({
    required this.controller,
    this.length = 6,
    this.enabled = true,
    this.hasError = false,
    this.onCompleted,
    super.key,
  }) : assert(length == 4 || length == 6, 'design system allows 4 or 6 boxes');

  final TextEditingController controller;
  final int length;
  final bool enabled;
  final bool hasError;
  final ValueChanged<String>? onCompleted;

  @override
  State<OtpInput> createState() => _OtpInputState();
}

class _OtpInputState extends State<OtpInput> {
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChanged);
    _focusNode.addListener(_onFocusChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChanged);
    _focusNode
      ..removeListener(_onFocusChanged)
      ..dispose();
    super.dispose();
  }

  void _onChanged() {
    setState(() {});
    if (widget.controller.text.length == widget.length) {
      widget.onCompleted?.call(widget.controller.text);
    }
  }

  void _onFocusChanged() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final value = widget.controller.text;

    return Stack(
      children: [
        // The real field, kept offstage but focusable so the platform keyboard,
        // paste and SMS autofill all behave normally.
        Positioned.fill(
          child: Opacity(
            opacity: 0,
            child: TextField(
              controller: widget.controller,
              focusNode: _focusNode,
              enabled: widget.enabled,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.oneTimeCode],
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(widget.length),
              ],
            ),
          ),
        ),
        GestureDetector(
          onTap: widget.enabled ? () => _focusNode.requestFocus() : null,
          child: Directionality(
            // Codes read left-to-right in every locale.
            textDirection: TextDirection.ltr,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < widget.length; i++)
                  Padding(
                    padding: EdgeInsets.only(
                      right: i == widget.length - 1 ? 0 : AppTokens.spaceMedium,
                    ),
                    child: _OtpBox(
                      digit: i < value.length ? value[i] : null,
                      active: _focusNode.hasFocus && i == value.length,
                      hasError: widget.hasError,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _OtpBox extends StatelessWidget {
  const _OtpBox({
    required this.digit,
    required this.active,
    required this.hasError,
  });

  final String? digit;
  final bool active;
  final bool hasError;

  @override
  Widget build(BuildContext context) {
    final Color borderColor;
    if (hasError) {
      borderColor = SemanticColors.error;
    } else if (active) {
      // Warm orange marks the box awaiting input.
      borderColor = SemanticColors.action;
    } else {
      borderColor = AppTheme.outlineVariant;
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 120),
      width: AppTokens.minTouchTarget,
      height: AppTokens.buttonHeight,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
        border: Border.all(color: borderColor, width: active || hasError ? 2 : 1),
      ),
      child: Text(
        digit ?? '',
        style: Theme.of(context).textTheme.headlineSmall,
      ),
    );
  }
}
