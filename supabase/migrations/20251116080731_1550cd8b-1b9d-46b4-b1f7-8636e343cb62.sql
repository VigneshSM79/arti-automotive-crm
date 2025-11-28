-- Step 1: Insert 5 new test leads
INSERT INTO leads (user_id, pipeline_stage_id, first_name, last_name, phone, email, city, state, created_at, tags)
VALUES 
-- Lead 1: Created today (New Contact stage)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5', 
 (SELECT id FROM pipeline_stages WHERE name = 'New Contact'),
 'John', 'Smithtest', '+1-555-0101', 'john.test@example.com', 'Austin', 'TX', 
 NOW(), ARRAY['website-inquiry']),

-- Lead 2: Created yesterday (Working Lead stage)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5',
 (SELECT id FROM pipeline_stages WHERE name = 'Working Lead'),
 'Sarah', 'Johnsontest', '+1-555-0102', 'sarah.test@example.com', 'Dallas', 'TX',
 NOW() - INTERVAL '1 day', ARRAY['referral', 'hot-lead']),

-- Lead 3: Created 2 days ago (Needs A Call stage)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5',
 (SELECT id FROM pipeline_stages WHERE name = 'Needs A Call'),
 'Mike', 'Davistest', '+1-555-0103', 'mike.test@example.com', 'Houston', 'TX',
 NOW() - INTERVAL '2 days', ARRAY['follow-up']),

-- Lead 4: Created 3 days ago (Working Lead stage)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5',
 (SELECT id FROM pipeline_stages WHERE name = 'Working Lead'),
 'Emily', 'Browntest', '+1-555-0104', 'emily.test@example.com', 'San Antonio', 'TX',
 NOW() - INTERVAL '3 days', ARRAY['interested']),

-- Lead 5: Created 10 days ago (I Accept stage)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5',
 (SELECT id FROM pipeline_stages WHERE name = 'I Accept'),
 'David', 'Wilsontest', '+1-555-0105', 'david.test@example.com', 'Fort Worth', 'TX',
 NOW() - INTERVAL '10 days', ARRAY['closed', 'customer']);

-- Step 2: Create conversations for new leads
INSERT INTO conversations (user_id, lead_id, status, last_message_at, unread_count, created_at)
VALUES
-- Conversation 1: John Smithtest (active, has unread)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5',
 (SELECT id FROM leads WHERE last_name = 'Smithtest'),
 'active', NOW() - INTERVAL '30 minutes', 2, NOW() - INTERVAL '2 hours'),

-- Conversation 2: Sarah Johnsontest (active, has unread)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5',
 (SELECT id FROM leads WHERE last_name = 'Johnsontest'),
 'active', NOW() - INTERVAL '3 hours', 1, NOW() - INTERVAL '1 day'),

-- Conversation 3: Mike Davistest (active, no unread)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5',
 (SELECT id FROM leads WHERE last_name = 'Davistest'),
 'active', NOW() - INTERVAL '5 hours', 0, NOW() - INTERVAL '2 days'),

-- Conversation 4: Emily Browntest (active, has unread)
('24cdb519-d51e-44b5-8db8-4a27d7204ca5',
 (SELECT id FROM leads WHERE last_name = 'Browntest'),
 'active', NOW() - INTERVAL '8 hours', 1, NOW() - INTERVAL '3 days');

-- Step 3: Populate messages for existing conversation (vignesh test)
INSERT INTO messages (conversation_id, direction, content, created_at, is_read)
VALUES
('361dcb5a-0830-4be5-9ae8-d1b05cb98ae2', 'inbound',
 'Hi, I saw your ad and I''m interested in learning more about your services.',
 NOW() - INTERVAL '2 days', true),

('361dcb5a-0830-4be5-9ae8-d1b05cb98ae2', 'outbound',
 'Hi Vignesh! Thanks for reaching out. I''d love to tell you more. When would be a good time to chat?',
 NOW() - INTERVAL '2 days' + INTERVAL '15 minutes', true),

('361dcb5a-0830-4be5-9ae8-d1b05cb98ae2', 'inbound',
 'How about tomorrow afternoon? I''m free after 2pm.',
 NOW() - INTERVAL '1 day', true),

('361dcb5a-0830-4be5-9ae8-d1b05cb98ae2', 'outbound',
 'Perfect! I''ll give you a call tomorrow at 2:30pm. Does that work?',
 NOW() - INTERVAL '1 day' + INTERVAL '10 minutes', true),

('361dcb5a-0830-4be5-9ae8-d1b05cb98ae2', 'inbound',
 'Yes, that works great. Talk to you then!',
 NOW() - INTERVAL '6 hours', true),

('361dcb5a-0830-4be5-9ae8-d1b05cb98ae2', 'outbound',
 'Great! Looking forward to our call. I''ll send you some info beforehand.',
 NOW() - INTERVAL '2 hours', true),

('361dcb5a-0830-4be5-9ae8-d1b05cb98ae2', 'inbound',
 'Sounds good, thank you!',
 NOW() - INTERVAL '1 hour', false);

-- Step 4: Messages for John Smithtest
INSERT INTO messages (conversation_id, direction, content, created_at, is_read)
VALUES
((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Smithtest')),
 'inbound', 'Hello, I got your number from a friend. Can you help me?',
 NOW() - INTERVAL '2 hours', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Smithtest')),
 'outbound', 'Hi John! Of course, I''d be happy to help. What are you looking for?',
 NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Smithtest')),
 'inbound', 'I''m interested in your solar panel installation services.',
 NOW() - INTERVAL '1 hour', false),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Smithtest')),
 'inbound', 'Are you available to discuss pricing?',
 NOW() - INTERVAL '30 minutes', false);

-- Step 5: Messages for Sarah Johnsontest
INSERT INTO messages (conversation_id, direction, content, created_at, is_read)
VALUES
((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Johnsontest')),
 'outbound', 'Hi Sarah, following up on our earlier conversation. Did you have a chance to review the proposal?',
 NOW() - INTERVAL '1 day', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Johnsontest')),
 'inbound', 'Yes I did, looks good! I have a few questions though.',
 NOW() - INTERVAL '6 hours', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Johnsontest')),
 'outbound', 'Great! I''m here to answer any questions you have.',
 NOW() - INTERVAL '5 hours', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Johnsontest')),
 'inbound', 'What''s the timeline for installation?',
 NOW() - INTERVAL '3 hours', false);

-- Step 6: Messages for Mike Davistest
INSERT INTO messages (conversation_id, direction, content, created_at, is_read)
VALUES
((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Davistest')),
 'inbound', 'I missed your call earlier. What did you need?',
 NOW() - INTERVAL '2 days', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Davistest')),
 'outbound', 'Hi Mike! Just wanted to follow up on your inquiry. Are you still interested?',
 NOW() - INTERVAL '2 days' + INTERVAL '20 minutes', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Davistest')),
 'inbound', 'Yes definitely! When can we schedule a consultation?',
 NOW() - INTERVAL '1 day', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Davistest')),
 'outbound', 'Perfect! I have availability tomorrow at 10am or 3pm. Which works better for you?',
 NOW() - INTERVAL '5 hours', true);

-- Step 7: Messages for Emily Browntest
INSERT INTO messages (conversation_id, direction, content, created_at, is_read)
VALUES
((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Browntest')),
 'outbound', 'Hi Emily, thanks for your interest! I have some information to share with you.',
 NOW() - INTERVAL '3 days', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Browntest')),
 'inbound', 'That would be great, thanks!',
 NOW() - INTERVAL '3 days' + INTERVAL '30 minutes', true),

((SELECT id FROM conversations WHERE lead_id = (SELECT id FROM leads WHERE last_name = 'Browntest')),
 'inbound', 'I reviewed everything. This looks perfect for my needs!',
 NOW() - INTERVAL '8 hours', false);

-- Step 8: Update existing conversation metadata
UPDATE conversations 
SET unread_count = 1,
    last_message_at = NOW() - INTERVAL '1 hour'
WHERE id = '361dcb5a-0830-4be5-9ae8-d1b05cb98ae2';