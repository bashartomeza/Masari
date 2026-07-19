-- A one-use invitation owns at most one onboarding attempt. This prevents a
-- second pre-consumption attempt from progressing after another attempt wins
-- the invitation redemption race.
CREATE UNIQUE INDEX `onboarding_attempts_invitation_id_key`
    ON `onboarding_attempts`(`invitation_id`);
