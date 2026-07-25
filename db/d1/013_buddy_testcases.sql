-- Local buddy feature test cases.
-- Login for all buddy-test accounts: Test1234!

DELETE FROM chat_message
WHERE friendship_id IN (
  SELECT id FROM friendship
  WHERE requester_id LIKE 'buddy-test-%'
     OR addressee_id LIKE 'buddy-test-%'
);

DELETE FROM buddy_challenge
WHERE friendship_id IN (
  SELECT id FROM friendship
  WHERE requester_id LIKE 'buddy-test-%'
     OR addressee_id LIKE 'buddy-test-%'
);

DELETE FROM activity_congrats
WHERE activity_feed_item_id IN (
  SELECT id FROM activity_feed_item
  WHERE user_id LIKE 'buddy-test-%'
);

DELETE FROM activity_feed_item
WHERE user_id LIKE 'buddy-test-%';

DELETE FROM notification
WHERE user_id LIKE 'buddy-test-%'
   OR sender_id LIKE 'buddy-test-%'
   OR (
     user_id = (SELECT id FROM app_user WHERE email = 'test@sculpt-app.de')
     AND sender_id LIKE 'buddy-test-%'
   )
   OR (
     sender_id = (SELECT id FROM app_user WHERE email = 'test@sculpt-app.de')
     AND user_id LIKE 'buddy-test-%'
   );

DELETE FROM workout_session
WHERE user_id LIKE 'buddy-test-%';

DELETE FROM friendship
WHERE requester_id LIKE 'buddy-test-%'
   OR addressee_id LIKE 'buddy-test-%'
   OR (
     requester_id = (SELECT id FROM app_user WHERE email = 'test@sculpt-app.de')
     AND addressee_id LIKE 'buddy-test-%'
   )
   OR (
     addressee_id = (SELECT id FROM app_user WHERE email = 'test@sculpt-app.de')
     AND requester_id LIKE 'buddy-test-%'
   );

INSERT INTO app_user (
  id, email, password_hash, full_name, display_name, avatar_url, gender_id,
  body_weight_kg, onboarding_completed, training_frequency_per_week,
  fitness_goal, experience_level, current_streak, longest_streak, total_points,
  hantel_coins, xp_total, current_level, league_id, league_points,
  auth_provider, created_at, updated_at, last_workout_at
) VALUES
('buddy-test-main', 'buddy-main@test.local', 'c2N1bHB0LWJ1ZGR5LW1haQ==:0JJZHCfZlJsb8zWIHF9C8HswEMdmLDXxW71+mspsIY4=', 'Buddy Main', 'Buddy Main', 'https://ui-avatars.com/api/?name=Buddy+Main&background=111827&color=fff&size=128', 1, 82, 1, 4, 'muscle_gain', 'intermediate', 9, 14, 12800, 900, 8600, 13, 2, 420, 'email', datetime('now', '-60 days'), datetime('now'), datetime('now', '-1 day')),
('buddy-test-alex', 'buddy-alex@test.local', 'c2N1bHB0LWJ1ZGR5LWFsZQ==:WamME1amvbsOl/+d6/Eqn5XsEoOYqUqeJzDNIWu4rSY=', 'Alex Active', 'Alex Active', 'https://ui-avatars.com/api/?name=Alex+Active&background=2563eb&color=fff&size=128', 1, 88, 1, 5, 'strength', 'advanced', 18, 24, 34100, 1400, 31000, 28, 4, 980, 'email', datetime('now', '-120 days'), datetime('now'), datetime('now', '-3 hours')),
('buddy-test-mia', 'buddy-mia@test.local', 'c2N1bHB0LWJ1ZGR5LW1pYQ==:IV2e3C7whN4z6ROjEl5VySIw/bltZoX2ory/dwNNWBQ=', 'Mia Comeback', 'Mia Comeback', 'https://ui-avatars.com/api/?name=Mia+Comeback&background=be185d&color=fff&size=128', 2, 64, 1, 3, 'health', 'beginner', 0, 7, 4200, 260, 3300, 8, 1, 140, 'email', datetime('now', '-45 days'), datetime('now'), datetime('now', '-12 days')),
('buddy-test-sam', 'buddy-sam@test.local', 'c2N1bHB0LWJ1ZGR5LXNhbQ==:dDiGrCp3ldHLywKGQs/1hOutwz7oTj7y2pVZcTqt6qk=', 'Sam Incoming', 'Sam Incoming', 'https://ui-avatars.com/api/?name=Sam+Incoming&background=047857&color=fff&size=128', 3, 76, 1, 4, 'endurance', 'intermediate', 6, 11, 9300, 720, 7500, 12, 2, 310, 'email', datetime('now', '-30 days'), datetime('now'), datetime('now', '-2 days')),
('buddy-test-lina', 'buddy-lina@test.local', 'c2N1bHB0LWJ1ZGR5LWxpbg==:mb9od2fbPqxpMehxw9/chfWRTT/E0MSrM/K0+GPXkIE=', 'Lina Outgoing', 'Lina Outgoing', 'https://ui-avatars.com/api/?name=Lina+Outgoing&background=7c3aed&color=fff&size=128', 2, 59, 1, 2, 'weight_loss', 'beginner', 3, 5, 5200, 480, 4400, 9, 1, 170, 'email', datetime('now', '-20 days'), datetime('now'), datetime('now', '-5 days')),
('buddy-test-noah', 'buddy-noah@test.local', 'c2N1bHB0LWJ1ZGR5LW5vYQ==:WRphQwjZ8zziCSJCadXpzQdWUnuuBNfNtO6kKm/A+JM=', 'Noah Blocked', 'Noah Blocked', 'https://ui-avatars.com/api/?name=Noah+Blocked&background=991b1b&color=fff&size=128', 1, 91, 1, 6, 'strength', 'advanced', 22, 30, 58000, 3000, 52000, 36, 5, 1600, 'email', datetime('now', '-160 days'), datetime('now'), datetime('now', '-1 day')),
('buddy-test-kim', 'buddy-kim@test.local', 'c2N1bHB0LWJ1ZGR5LWtpbQ==:Mn7w2nETs8wGI8+3CCsZvouH3uVB2S8X3nuJn/Uq468=', 'Kim Searchable', 'Kim Searchable', 'https://ui-avatars.com/api/?name=Kim+Searchable&background=ca8a04&color=fff&size=128', 2, 67, 1, 3, 'muscle_gain', 'intermediate', 11, 13, 17700, 1100, 14600, 18, 3, 690, 'email', datetime('now', '-70 days'), datetime('now'), datetime('now', '-6 hours'))
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  password_hash = excluded.password_hash,
  full_name = excluded.full_name,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  gender_id = excluded.gender_id,
  body_weight_kg = excluded.body_weight_kg,
  onboarding_completed = excluded.onboarding_completed,
  training_frequency_per_week = excluded.training_frequency_per_week,
  fitness_goal = excluded.fitness_goal,
  experience_level = excluded.experience_level,
  current_streak = excluded.current_streak,
  longest_streak = excluded.longest_streak,
  total_points = excluded.total_points,
  hantel_coins = excluded.hantel_coins,
  xp_total = excluded.xp_total,
  current_level = excluded.current_level,
  league_id = excluded.league_id,
  league_points = excluded.league_points,
  updated_at = datetime('now'),
  last_workout_at = excluded.last_workout_at;

UPDATE app_user
SET onboarding_completed = 1,
    current_streak = MAX(current_streak, 7),
    current_level = MAX(current_level, 11),
    fitness_goal = COALESCE(fitness_goal, 'health'),
    last_workout_at = COALESCE(last_workout_at, datetime('now', '-1 day'))
WHERE email = 'test@sculpt-app.de';

INSERT INTO friendship (requester_id, addressee_id, status_id, friend_streak, last_both_trained_at, created_at, updated_at)
VALUES
('buddy-test-main', 'buddy-test-alex', (SELECT id FROM friendship_status WHERE code = 'accepted'), 8, datetime('now', '-1 day'), datetime('now', '-28 days'), datetime('now', '-1 day')),
('buddy-test-main', 'buddy-test-mia', (SELECT id FROM friendship_status WHERE code = 'accepted'), 0, datetime('now', '-14 days'), datetime('now', '-20 days'), datetime('now', '-12 days')),
('buddy-test-sam', 'buddy-test-main', (SELECT id FROM friendship_status WHERE code = 'pending'), 0, NULL, datetime('now', '-2 days'), datetime('now', '-2 days')),
('buddy-test-main', 'buddy-test-lina', (SELECT id FROM friendship_status WHERE code = 'pending'), 0, NULL, datetime('now', '-1 day'), datetime('now', '-1 day')),
('buddy-test-main', 'buddy-test-noah', (SELECT id FROM friendship_status WHERE code = 'blocked'), 0, NULL, datetime('now', '-10 days'), datetime('now', '-10 days')),
((SELECT id FROM app_user WHERE email = 'test@sculpt-app.de'), 'buddy-test-alex', (SELECT id FROM friendship_status WHERE code = 'accepted'), 5, datetime('now', '-1 day'), datetime('now', '-18 days'), datetime('now', '-1 day')),
((SELECT id FROM app_user WHERE email = 'test@sculpt-app.de'), 'buddy-test-mia', (SELECT id FROM friendship_status WHERE code = 'accepted'), 0, datetime('now', '-10 days'), datetime('now', '-14 days'), datetime('now', '-10 days')),
('buddy-test-sam', (SELECT id FROM app_user WHERE email = 'test@sculpt-app.de'), (SELECT id FROM friendship_status WHERE code = 'pending'), 0, NULL, datetime('now', '-3 hours'), datetime('now', '-3 hours')),
((SELECT id FROM app_user WHERE email = 'test@sculpt-app.de'), 'buddy-test-lina', (SELECT id FROM friendship_status WHERE code = 'pending'), 0, NULL, datetime('now', '-8 hours'), datetime('now', '-8 hours')),
((SELECT id FROM app_user WHERE email = 'test@sculpt-app.de'), 'buddy-test-noah', (SELECT id FROM friendship_status WHERE code = 'blocked'), 0, NULL, datetime('now', '-9 days'), datetime('now', '-9 days'));

INSERT INTO buddy_challenge (
  friendship_id, challenge_type_id, challenger_id, opponent_id, target_value,
  wager_coins, created_at, accepted_at, starts_at, ends_at,
  challenger_progress, opponent_progress, status, winner_id, xp_reward
) VALUES
((SELECT id FROM friendship WHERE requester_id = 'buddy-test-main' AND addressee_id = 'buddy-test-alex'), (SELECT id FROM challenge_type WHERE code = 'total_volume'), 'buddy-test-main', 'buddy-test-alex', 12000, 100, datetime('now', '-2 days'), datetime('now', '-2 days'), datetime('now', '-2 days'), datetime('now', '+5 days'), 6200, 7800, 'active', NULL, 180),
((SELECT id FROM friendship WHERE requester_id = 'buddy-test-main' AND addressee_id = 'buddy-test-mia'), (SELECT id FROM challenge_type WHERE code = 'workout_count'), 'buddy-test-mia', 'buddy-test-main', 4, 0, datetime('now', '-1 day'), NULL, datetime('now', '+1 day'), datetime('now', '+8 days'), 0, 0, 'pending', NULL, 100),
((SELECT id FROM friendship WHERE requester_id = 'buddy-test-main' AND addressee_id = 'buddy-test-alex'), (SELECT id FROM challenge_type WHERE code = 'workout_count'), 'buddy-test-alex', 'buddy-test-main', 5, 50, datetime('now', '-12 days'), datetime('now', '-12 days'), datetime('now', '-12 days'), datetime('now', '-5 days'), 5, 3, 'completed', 'buddy-test-alex', 120);

INSERT INTO notification (user_id, notification_type_id, sender_id, title, body, data, is_read, created_at)
VALUES
('buddy-test-main', (SELECT id FROM notification_type WHERE code = 'friend_request'), 'buddy-test-sam', 'Neue Buddy-Anfrage', 'Sam Incoming moechte dein Buddy sein.', '{"friendshipId":"incoming-main-sam"}', 0, datetime('now', '-2 days')),
('buddy-test-main', (SELECT id FROM notification_type WHERE code = 'buddy_reminder'), 'buddy-test-alex', 'Trainings-Reminder', 'Alex Active sagt: Zeit fuer dein Training!', '{"friendshipId":"main-alex"}', 0, datetime('now', '-4 hours')),
((SELECT id FROM app_user WHERE email = 'test@sculpt-app.de'), (SELECT id FROM notification_type WHERE code = 'friend_request'), 'buddy-test-sam', 'Neue Buddy-Anfrage', 'Sam Incoming moechte dein Buddy sein.', '{"friendshipId":"test-sam"}', 0, datetime('now', '-3 hours')),
((SELECT id FROM app_user WHERE email = 'test@sculpt-app.de'), (SELECT id FROM notification_type WHERE code = 'buddy_reminder'), 'buddy-test-alex', 'Trainings-Reminder', 'Alex Active sagt: Zeit fuer dein Training!', '{"friendshipId":"test-alex"}', 0, datetime('now', '-2 hours'));

INSERT INTO activity_feed_item (user_id, activity_type_id, metadata, visibility, created_at)
VALUES
('buddy-test-alex', (SELECT id FROM activity_type WHERE slug = 'workout_completed'), '{"workoutName":"Push Day","volumeKg":18400,"durationMin":72}', 'friends', datetime('now', '-3 hours')),
('buddy-test-mia', (SELECT id FROM activity_type WHERE slug = 'streak_milestone'), '{"count":7}', 'friends', datetime('now', '-13 days')),
('buddy-test-kim', (SELECT id FROM activity_type WHERE slug = 'pr_achieved'), '{"exercise":"Deadlift","weightKg":120}', 'friends', datetime('now', '-6 hours'));

INSERT INTO workout_session (user_id, started_at, completed_at, duration_seconds, total_volume_kg, calories_burned, notes)
VALUES
('buddy-test-alex', datetime('now', '-3 hours'), datetime('now', '-2 hours'), 3900, 18400, 620, 'Buddy seed: heavy push'),
('buddy-test-mia', datetime('now', '-12 days'), datetime('now', '-12 days', '+45 minutes'), 2700, 4200, 310, 'Buddy seed: comeback session'),
('buddy-test-kim', datetime('now', '-6 hours'), datetime('now', '-5 hours'), 3600, 9200, 480, 'Buddy seed: searchable fresh activity');

INSERT INTO chat_message (friendship_id, sender_id, encrypted_content, ephemeral_public_key, mac, nonce, message_type, is_read, created_at)
VALUES
((SELECT id FROM friendship WHERE requester_id = 'buddy-test-main' AND addressee_id = 'buddy-test-alex'), 'buddy-test-alex', 'local-test-ciphertext-alex-1', 'local-test-key', 'local-test-mac', 'local-test-nonce-1', 'text', 0, datetime('now', '-2 hours')),
((SELECT id FROM friendship WHERE requester_id = 'buddy-test-main' AND addressee_id = 'buddy-test-alex'), 'buddy-test-main', 'local-test-ciphertext-main-1', 'local-test-key', 'local-test-mac', 'local-test-nonce-2', 'text', 1, datetime('now', '-90 minutes'));
