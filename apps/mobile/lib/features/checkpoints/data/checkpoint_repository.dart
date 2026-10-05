import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../domain/checkpoint_models.dart';

final checkpointRepositoryProvider = Provider<CheckpointRepository>((ref) {
  return const CheckpointRepository();
});

/// Temporary direct connection to AweenRayeh.
///
/// TODO:
/// Move the API key back to Masari backend before production.
/// The AweenRayeh documentation explicitly says the key should
/// remain server-side and not be embedded in a mobile app.
class CheckpointRepository {
  const CheckpointRepository();

  static const String _baseUrl = 'https://db.aweenrayeh.com';

  static const String _apiKey =
      'ar_partner_hebron_9a85ac2f1980a9db974ec558f0bfef16cef6d26bddd79445';

  Future<CheckpointSnapshot> checkpoints() async {
    final response = await http.get(
      Uri.parse('$_baseUrl/v1/partner/checkpoints'),
      headers: {
        'X-Api-Key': _apiKey,
        'Accept': 'application/json',
      },
    );

    print('AweenRayeh status: ${response.statusCode}');
    print('AweenRayeh response: ${response.body}');

    if (response.statusCode != 200) {
      throw Exception(
        'AweenRayeh API error: '
        '${response.statusCode} ${response.body}',
      );
    }

    final decoded = jsonDecode(response.body);

    if (decoded is! Map<String, dynamic>) {
      throw const FormatException(
        'Invalid AweenRayeh response',
      );
    }

    return CheckpointSnapshot.fromJson(decoded);
  }
}