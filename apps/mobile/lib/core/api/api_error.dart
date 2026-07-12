enum ApiErrorType {
  network,
  timeout,
  validation,
  unauthorized,
  forbidden,
  server,
  unknown,
}

class ApiException implements Exception {
  const ApiException(this.type, this.message, {this.statusCode});

  final ApiErrorType type;
  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException($type, statusCode: $statusCode)';
}
