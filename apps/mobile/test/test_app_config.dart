import 'package:masari_mobile/core/config/app_config.dart';

const demoTestAppConfig = AppConfig(
  appEnvironment: MasariAppEnvironment.test,
  apiBaseUrl: 'http://10.0.2.2:3000',
  demoFeaturesEnabled: true,
  demoCredentials: DemoCredentialConfig(
    passengerEmail: 'passenger@demo.masari',
    passengerPassword: 'mobile-test-passenger-secret',
    driverEmail: 'driver@demo.masari',
    driverPassword: 'mobile-test-driver-secret',
    merchantEmail: 'merchant@demo.masari',
    merchantPassword: 'mobile-test-merchant-secret',
  ),
);

const productionTestAppConfig = AppConfig(
  appEnvironment: MasariAppEnvironment.production,
  apiBaseUrl: 'https://api.masari.example',
  demoFeaturesEnabled: false,
);
