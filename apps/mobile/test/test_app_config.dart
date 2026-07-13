import 'package:masari_mobile/core/config/app_config.dart';

const demoTestAppConfig = AppConfig(
  appEnvironment: MasariAppEnvironment.test,
  apiBaseUrl: 'http://10.0.2.2:3000',
  demoFeaturesEnabled: true,
  demoCredentials: DemoCredentialConfig(
    passengerPhone: '+970590000001',
    passengerPassword: 'mobile-test-passenger-secret',
    driverPhone: '+970590000002',
    driverPassword: 'mobile-test-driver-secret',
    merchantPhone: '+970590000004',
    merchantPassword: 'mobile-test-merchant-secret',
  ),
);

const productionTestAppConfig = AppConfig(
  appEnvironment: MasariAppEnvironment.production,
  apiBaseUrl: 'https://api.masari.example',
  demoFeaturesEnabled: false,
);
