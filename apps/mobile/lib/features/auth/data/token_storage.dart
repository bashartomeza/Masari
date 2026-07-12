import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(ref.watch(secureStorageProvider));
});

class TokenStorage {
  const TokenStorage(this._storage);

  static const tokenKey = 'masari_jwt';

  final FlutterSecureStorage _storage;

  Future<String?> readToken() => _storage.read(key: tokenKey);

  Future<void> saveToken(String token) =>
      _storage.write(key: tokenKey, value: token);

  Future<void> clearToken() => _storage.delete(key: tokenKey);
}
