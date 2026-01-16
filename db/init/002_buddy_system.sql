-- =====================================================
-- SCULPT FITNESS APP - BUDDY SYSTEM SCHEMA
-- =====================================================
-- Extension for the main schema - adds friend/buddy features
-- =====================================================

-- Friendship status types
CREATE TABLE IF NOT EXISTS friendship_status (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name_de VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL
);

INSERT INTO friendship_status (code, name_de, name_en) VALUES
    ('pending', 'Ausstehend', 'Pending'),
    ('accepted', 'Akzeptiert', 'Accepted'),
    ('blocked', 'Blockiert', 'Blocked')
ON CONFLICT (code) DO NOTHING;

-- Friendships / Buddy connections
CREATE TABLE IF NOT EXISTS friendship (
    id SERIAL PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    status_id INTEGER NOT NULL REFERENCES friendship_status(id) DEFAULT 1,
    friend_streak INTEGER DEFAULT 0,
    last_both_trained_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id),
    CHECK(requester_id != addressee_id)
);

-- Notification types for the buddy system
CREATE TABLE IF NOT EXISTS notification_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_de VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    template_de TEXT NOT NULL,
    template_en TEXT NOT NULL,
    icon_name VARCHAR(50) NOT NULL
);

INSERT INTO notification_type (code, name_de, name_en, template_de, template_en, icon_name) VALUES
    ('friend_request', 'Freundschaftsanfrage', 'Friend Request', '{name} möchte dein Buddy sein!', '{name} wants to be your buddy!', 'user-plus'),
    ('friend_accepted', 'Anfrage akzeptiert', 'Request Accepted', '{name} hat deine Anfrage akzeptiert!', '{name} accepted your request!', 'check-circle'),
    ('workout_completed', 'Training abgeschlossen', 'Workout Completed', '{name} hat gerade ein Training abgeschlossen! 💪', '{name} just completed a workout! 💪', 'dumbbell'),
    ('badge_earned', 'Badge verdient', 'Badge Earned', '{name} hat "{badge}" freigeschaltet! 🏆', '{name} unlocked "{badge}"! 🏆', 'trophy'),
    ('streak_milestone', 'Streak-Meilenstein', 'Streak Milestone', '{name} hat einen {count}-Wochen-Streak! 🔥', '{name} reached a {count}-week streak! 🔥', 'flame'),
    ('pr_achieved', 'Persönlicher Rekord', 'Personal Record', '{name} hat einen neuen PR bei {exercise}! 🎉', '{name} set a new PR on {exercise}! 🎉', 'trending-up'),
    ('buddy_reminder', 'Buddy-Erinnerung', 'Buddy Reminder', '{name} sagt: Zeit für dein Training!', '{name} says: Time for your workout!', 'bell'),
    ('congrats_received', 'Gratulation erhalten', 'Congrats Received', '{name} gratuliert dir! 🎊', '{name} congratulates you! 🎊', 'party-popper'),
    ('friend_streak_broken', 'Freundes-Streak verloren', 'Friend Streak Broken', 'Euer {count}-Wochen-Streak ist verloren! 😢', 'Your {count}-week streak was broken! 😢', 'flame-off'),
    ('friend_streak_milestone', 'Freundes-Streak Meilenstein', 'Friend Streak Milestone', '{name} und du: {count} Wochen gemeinsam stark! 💪', 'You and {name}: {count} weeks strong together! 💪', 'users')
ON CONFLICT (code) DO NOTHING;

-- User notifications (in-app + push)
CREATE TABLE IF NOT EXISTS notification (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    notification_type_id INTEGER NOT NULL REFERENCES notification_type(id),
    sender_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    is_push_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_token (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- E2E Encrypted Chat Messages
-- Using Signal Protocol style: messages are encrypted client-side
CREATE TABLE IF NOT EXISTS chat_message (
    id SERIAL PRIMARY KEY,
    friendship_id INTEGER NOT NULL REFERENCES friendship(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    -- Encrypted content (Base64 encoded ciphertext)
    encrypted_content TEXT NOT NULL,
    -- Ephemeral public key for this message (for key exchange)
    ephemeral_public_key TEXT NOT NULL,
    -- Message authentication code
    mac TEXT NOT NULL,
    -- Nonce/IV for decryption
    nonce TEXT NOT NULL,
    -- Message type: 'text', 'congrats', 'reminder', 'brag'
    message_type VARCHAR(20) DEFAULT 'text',
    -- Reference to achievement/workout being bragged about
    reference_type VARCHAR(50),
    reference_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User's public keys for E2E encryption
CREATE TABLE IF NOT EXISTS user_encryption_key (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    identity_public_key TEXT NOT NULL, -- Long-term identity key
    signed_prekey_public TEXT NOT NULL, -- Signed pre-key
    signed_prekey_signature TEXT NOT NULL, -- Signature
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- One-time prekeys for initial key exchange
CREATE TABLE IF NOT EXISTS user_prekey (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    prekey_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, prekey_id)
);

-- Brag/Achievement feed items (auto-shared with buddies)
CREATE TABLE IF NOT EXISTS activity_feed_item (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'workout', 'badge', 'pr', 'streak'
    title_de TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_de TEXT,
    description_en TEXT,
    icon_name VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    visibility VARCHAR(20) DEFAULT 'friends', -- 'friends', 'public', 'private'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Congratulations on activity feed items
CREATE TABLE IF NOT EXISTS activity_congrats (
    id SERIAL PRIMARY KEY,
    activity_feed_item_id INTEGER NOT NULL REFERENCES activity_feed_item(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    emoji VARCHAR(10) DEFAULT '🎉',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_feed_item_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendship_requester ON friendship(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendship_addressee ON friendship(addressee_id);
CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_chat_message_friendship ON chat_message(friendship_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed_item(user_id, created_at);

-- Function to update friend streak
CREATE OR REPLACE FUNCTION update_friend_streak()
RETURNS TRIGGER AS $$
DECLARE
    friend_user_id UUID;
    friend_last_workout TIMESTAMP WITH TIME ZONE;
    current_user_last_workout TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the workout user's last workout time
    current_user_last_workout := NEW.last_workout_at;
    
    -- Find all accepted friendships
    FOR friend_user_id IN 
        SELECT CASE 
            WHEN requester_id = NEW.id THEN addressee_id 
            ELSE requester_id 
        END
        FROM friendship f
        JOIN friendship_status fs ON f.status_id = fs.id
        WHERE (requester_id = NEW.id OR addressee_id = NEW.id)
        AND fs.code = 'accepted'
    LOOP
        -- Get friend's last workout
        SELECT last_workout_at INTO friend_last_workout 
        FROM app_user WHERE id = friend_user_id;
        
        -- If both trained this week, update friend streak
        IF friend_last_workout >= NOW() - INTERVAL '7 days' 
           AND current_user_last_workout >= NOW() - INTERVAL '7 days' THEN
            UPDATE friendship
            SET friend_streak = friend_streak + 1,
                last_both_trained_at = NOW(),
                updated_at = NOW()
            WHERE (requester_id = NEW.id AND addressee_id = friend_user_id)
               OR (requester_id = friend_user_id AND addressee_id = NEW.id);
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update friend streaks when user workouts
DROP TRIGGER IF EXISTS update_friend_streak_trigger ON app_user;
CREATE TRIGGER update_friend_streak_trigger
    AFTER UPDATE OF last_workout_at ON app_user
    FOR EACH ROW
    WHEN (OLD.last_workout_at IS DISTINCT FROM NEW.last_workout_at)
    EXECUTE FUNCTION update_friend_streak();

-- Trigger for updated_at on friendship
CREATE TRIGGER update_friendship_updated_at BEFORE UPDATE ON friendship
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
