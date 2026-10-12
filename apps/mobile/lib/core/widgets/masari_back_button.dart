import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Returns to the previous route, including when a detail was opened directly.
class MasariBackButton extends StatelessWidget {
  const MasariBackButton({required this.fallback, super.key});
  final String fallback;

  @override
  Widget build(BuildContext context) => BackButton(
    key: const ValueKey('masariBackButton'),
    onPressed: () {
      final router = GoRouter.of(context);
      if (router.canPop()) {
        router.pop();
      } else {
        router.go(fallback);
      }
    },
  );
}
