-- M6C2B2 requires database-enforced separation between public onboarding
-- continuation credentials and pending-account status credentials. The same
-- forward-only migration adds the bounded audit vocabulary used by the public
-- orchestration; it does not add a table or column.
ALTER TABLE `audit_events` MODIFY `action` ENUM(
  'auth_login',
  'session_created',
  'session_refreshed',
  'session_revoked',
  'logout_all',
  'refresh_token_reuse_detected',
  'account_status_changed',
  'login_blocked_by_status',
  'demo_reset',
  'passenger_request_created',
  'passenger_request_cancelled',
  'driver_route_created',
  'driver_route_deactivated',
  'merchant_order_created',
  'parcel_batch_created',
  'comparison_run_created',
  'match_accepted',
  'match_rejected',
  'trip_status_updated',
  'location_recorded',
  'tracking_simulation_step',
  'driver_verification',
  'match_decision',
  'admin_action',
  'invitation_created',
  'invitation_revoked',
  'invitation_redeemed',
  'otp_challenge_created',
  'otp_verified',
  'consent_recorded',
  'invitation_consumed',
  'onboarding_attempt_created',
  'otp_dispatch_accepted',
  'otp_dispatch_rejected',
  'otp_verification_failed',
  'onboarding_session_created',
  'onboarding_session_revoked',
  'consent_document_created',
  'abuse_limit_reached',
  'idempotency_conflict',
  'onboarding_started',
  'onboarding_resumed',
  'otp_resent',
  'registration_completed',
  'registration_completion_failed',
  'pending_status_session_created',
  'onboarding_status_accessed',
  'onboarding_rate_limited',
  'onboarding_idempotency_conflict'
) NOT NULL;

ALTER TABLE `onboarding_sessions`
  MODIFY `purpose` ENUM('onboarding_completion', 'continuation', 'pending_status')
  NOT NULL DEFAULT 'onboarding_completion';
