enum UserRole { passenger, driver, merchant, admin, unsupported }

UserRole parseUserRole(String value) {
  return switch (value) {
    'passenger' => UserRole.passenger,
    'driver' => UserRole.driver,
    'merchant' => UserRole.merchant,
    'admin' => UserRole.admin,
    _ => UserRole.unsupported,
  };
}

class AuthUser {
  const AuthUser({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    required this.demoAccount,
  });

  final String id;
  final String name;
  final String phone;
  final UserRole role;
  final bool demoAccount;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: _readString(json, 'id'),
      name: _readString(json, 'name'),
      phone: _readString(json, 'phone'),
      role: parseUserRole(_readString(json, 'role')),
      demoAccount: json['demo_account'] == true,
    );
  }
}

class LoginResult {
  const LoginResult({required this.token, required this.user});

  final String token;
  final AuthUser user;

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'];
    if (userJson is! Map<String, dynamic>) {
      throw const FormatException('Missing user');
    }
    return LoginResult(
      token: _readString(json, 'token'),
      user: AuthUser.fromJson(userJson),
    );
  }
}

String _readString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) {
    return value;
  }
  throw FormatException('Missing $key');
}
