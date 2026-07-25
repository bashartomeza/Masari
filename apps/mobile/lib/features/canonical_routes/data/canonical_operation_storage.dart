import 'dart:convert';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../auth/data/token_storage.dart';

final canonicalOperationStorageProvider = Provider<CanonicalOperationStorage>((
  ref,
) {
  return CanonicalOperationStorage(ref.watch(secureStorageProvider));
});

class CanonicalOperationBundle {
  const CanonicalOperationBundle({
    required this.operation,
    required this.scope,
    required this.idempotencyKey,
    required this.payload,
    required this.fingerprint,
    required this.createdAt,
    required this.routeVersionId,
  });

  static const version = 1;
  final String operation;
  final String scope;
  final String idempotencyKey;
  final Map<String, dynamic> payload;
  final String fingerprint;
  final DateTime createdAt;
  final String routeVersionId;

  factory CanonicalOperationBundle.create({
    required String operation,
    required String scope,
    required Map<String, dynamic> payload,
  }) {
    final normalized = _normalize(payload);
    return CanonicalOperationBundle(
      operation: operation,
      scope: scope,
      idempotencyKey: newCanonicalIdempotencyKey(),
      payload: normalized,
      fingerprint: _fingerprint(jsonEncode(normalized)),
      createdAt: DateTime.now().toUtc(),
      routeVersionId: normalized['route_version_id'] as String,
    );
  }

  bool get expired =>
      DateTime.now().toUtc().difference(createdAt) > const Duration(hours: 24);

  Map<String, dynamic> toJson() => {
    'version': version,
    'operation': operation,
    'scope': scope,
    'idempotency_key': idempotencyKey,
    'payload': payload,
    'fingerprint': fingerprint,
    'created_at': createdAt.toIso8601String(),
    'route_version_id': routeVersionId,
  };

  factory CanonicalOperationBundle.fromJson(Map<String, dynamic> json) {
    if (json['version'] != version ||
        json['operation'] is! String ||
        json['scope'] is! String ||
        json['idempotency_key'] is! String ||
        json['payload'] is! Map<String, dynamic> ||
        json['fingerprint'] is! String ||
        json['created_at'] is! String ||
        json['route_version_id'] is! String) {
      throw const FormatException('Invalid canonical operation bundle');
    }
    final createdAt = DateTime.tryParse(json['created_at'] as String);
    final payload = _normalize(json['payload'] as Map<String, dynamic>);
    if (createdAt == null ||
        _fingerprint(jsonEncode(payload)) != json['fingerprint']) {
      throw const FormatException('Invalid canonical operation bundle');
    }
    return CanonicalOperationBundle(
      operation: json['operation'] as String,
      scope: json['scope'] as String,
      idempotencyKey: json['idempotency_key'] as String,
      payload: payload,
      fingerprint: json['fingerprint'] as String,
      createdAt: createdAt.toUtc(),
      routeVersionId: json['route_version_id'] as String,
    );
  }
}

class CanonicalOperationStorage {
  const CanonicalOperationStorage(this._storage);

  static const bundleKey = 'masari_canonical_operation_v1';
  final FlutterSecureStorage _storage;

  Future<CanonicalOperationBundle?> read() async {
    final encoded = await _storage.read(key: bundleKey);
    if (encoded == null || encoded.isEmpty) return null;
    try {
      final decoded = jsonDecode(encoded);
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('Invalid canonical operation bundle');
      }
      final bundle = CanonicalOperationBundle.fromJson(decoded);
      if (bundle.expired) {
        await clear();
        return null;
      }
      return bundle;
    } on FormatException {
      await clear();
      return null;
    }
  }

  Future<void> save(CanonicalOperationBundle bundle) {
    if (bundle.expired) throw StateError('Refusing expired operation bundle');
    return _storage.write(key: bundleKey, value: jsonEncode(bundle.toJson()));
  }

  Future<void> clear() => _storage.delete(key: bundleKey);
}

String newCanonicalIdempotencyKey() {
  const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-';
  final random = Random.secure();
  return List.generate(
    32,
    (_) => alphabet[random.nextInt(alphabet.length)],
  ).join();
}

Map<String, dynamic> _normalize(Map<String, dynamic> input) {
  final keys = input.keys.toList()..sort();
  return {
    for (final key in keys)
      key: switch (input[key]) {
        Map<String, dynamic> map => _normalize(map),
        List list =>
          list
              .map(
                (value) =>
                    value is Map<String, dynamic> ? _normalize(value) : value,
              )
              .toList(growable: false),
        final value => value,
      },
  };
}

String _fingerprint(String value) {
  var hash = 0xcbf29ce484222325;
  for (final unit in utf8.encode(value)) {
    hash ^= unit;
    hash = (hash * 0x100000001b3) & 0x7fffffffffffffff;
  }
  return hash.toRadixString(16).padLeft(16, '0');
}
