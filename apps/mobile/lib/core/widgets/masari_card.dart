import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

class MasariCard extends StatelessWidget {
  const MasariCard({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppTokens.spaceLarge),
        child: child,
      ),
    );
  }
}
