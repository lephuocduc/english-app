-- ListenFlow Sample Seed Data
-- Usage: wrangler d1 execute listenflow-db --local --file=./migrations/seed.sql

-- Insert demo users
INSERT OR IGNORE INTO users (id, username, created_at)
VALUES 
    ('user-demo-1', 'alex_learner', '2026-03-01 08:00:00'),
    ('user-demo-2', 'sam_student', '2026-03-02 09:30:00');

-- Insert a sample YouTube lesson for user-demo-1
INSERT OR IGNORE INTO lessons (id, user_id, video_id, title, description, language, level, created_at, updated_at)
VALUES 
    (
        'lesson-seed-1',
        'user-demo-1',
        'UF8uR6Z6KLc',
        'Steve Jobs Stanford Commencement Address 2005',
        'Key opening sentences of the historic Stanford commencement address on connecting the dots.',
        'en',
        'Intermediate',
        '2026-03-01 08:05:00',
        '2026-03-01 08:05:00'
    );

-- Insert user-provided transcript segments
INSERT OR IGNORE INTO transcript_segments (id, lesson_id, user_id, start_time, end_time, text, translation, hint, sequence_order, created_at)
VALUES 
    (
        'seg-seed-1',
        'lesson-seed-1',
        'user-demo-1',
        0.0,
        4.5,
        'I am honored to be with you today at your commencement from one of the finest universities in the world.',
        'Tôi rất vinh dự được có mặt cùng các bạn hôm nay tại buổi lễ tốt nghiệp từ một trong những trường đại học tốt nhất thế giới.',
        'honored to be with you today',
        0,
        '2026-03-01 08:10:00'
    ),
    (
        'seg-seed-2',
        'lesson-seed-1',
        'user-demo-1',
        4.6,
        8.2,
        'I never graduated from college.',
        'Tôi chưa từng tốt nghiệp đại học.',
        'never graduated',
        1,
        '2026-03-01 08:10:00'
    ),
    (
        'seg-seed-3',
        'lesson-seed-1',
        'user-demo-1',
        8.3,
        14.0,
        'Truth be told, this is the closest I''ve ever gotten to a college graduation.',
        'Nói thật lòng thì đây là lần tôi đến gần nhất với một lễ tốt nghiệp đại học.',
        'Truth be told...',
        2,
        '2026-03-01 08:10:00'
    );

-- Insert sample dictation attempt
INSERT OR IGNORE INTO dictation_attempts (id, lesson_id, segment_id, user_id, user_input, score, accuracy, correct_count, missing_count, incorrect_count, extra_count, created_at)
VALUES 
    (
        'attempt-seed-1',
        'lesson-seed-1',
        'seg-seed-1',
        'user-demo-1',
        'I am honored to be with you today at your commencement from one of the finest universities in the world',
        100,
        1.0,
        19,
        0,
        0,
        0,
        '2026-03-01 08:15:00'
    );

-- Insert sentence learning progress
INSERT OR IGNORE INTO sentence_progress (id, user_id, lesson_id, segment_id, user_input, score, is_revealed, attempts_count, completed, last_attempt_at, updated_at)
VALUES 
    (
        'prog-seed-1',
        'user-demo-1',
        'lesson-seed-1',
        'seg-seed-1',
        'I am honored to be with you today at your commencement from one of the finest universities in the world',
        100,
        0,
        1,
        1,
        '2026-03-01 08:15:00',
        '2026-03-01 08:15:00'
    ),
    (
        'prog-seed-2',
        'user-demo-1',
        'lesson-seed-1',
        'seg-seed-2',
        'I never graduated',
        60,
        0,
        1,
        0,
        '2026-03-01 08:16:00',
        '2026-03-01 08:16:00'
    );

-- Insert saved vocabulary
INSERT OR IGNORE INTO saved_vocabulary (id, user_id, word, meaning, context_sentence, timestamp, video_id, lesson_title, saved_at)
VALUES 
    (
        'vocab-seed-1',
        'user-demo-1',
        'commencement',
        'A graduation ceremony or celebration where degrees or diplomas are conferred.',
        'I am honored to be with you today at your commencement from one of the finest universities in the world.',
        2.5,
        'UF8uR6Z6KLc',
        'Steve Jobs Stanford Commencement Address 2005',
        '2026-03-01 08:17:00'
    ),
    (
        'vocab-seed-2',
        'user-demo-1',
        'honored',
        'Feeling respected and privileged to be invited or included.',
        'I am honored to be with you today at your commencement from one of the finest universities in the world.',
        1.0,
        'UF8uR6Z6KLc',
        'Steve Jobs Stanford Commencement Address 2005',
        '2026-03-01 08:18:00'
    );
