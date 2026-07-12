class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  const AppConfig.fromEnvironment()
    : apiBaseUrl = const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://10.0.2.2:3000',
      );

  final String apiBaseUrl;
}
