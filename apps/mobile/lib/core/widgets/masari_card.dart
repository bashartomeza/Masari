import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

class MasariCard extends StatelessWidget {
  const MasariCard({required this.child, this.onTap, super.key});

  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: onTap == null ? Clip.none : Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppTokens.spaceLarge),
          child: child,
        ),
      ),
    );
  }
}
