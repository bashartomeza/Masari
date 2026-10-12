import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The actor that currently owns authenticated, account-private provider work.
///
/// Credentials remain owned by [AuthSessionCoordinator]. This deliberately
/// contains only a non-secret user id so providers can fence delayed results
/// across logout, revocation, and account switching.
final authenticatedActorBindingProvider = Provider<AuthenticatedActorBinding>(
  (_) => AuthenticatedActorBinding(),
);

class AuthenticatedActorBinding {
  String? _actorId;

  String? get actorId => _actorId;

  void bind(String actorId) => _actorId = actorId;

  void clear() => _actorId = null;
}
