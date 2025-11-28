-- Create pipeline_stages table
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  order_position INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  pipeline_stage_id UUID REFERENCES public.pipeline_stages(id) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  unread_count INTEGER DEFAULT 0 NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, lead_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  target_pipeline_stage_id UUID REFERENCES public.pipeline_stages(id),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create campaign_messages table
CREATE TABLE public.campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  message_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(campaign_id, sequence_order)
);

-- Create campaign_enrollments table
CREATE TABLE public.campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  current_message_index INTEGER DEFAULT 0 NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(lead_id, campaign_id)
);

-- Create message_templates table
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_pipeline_stage ON public.leads(pipeline_stage_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_campaign_enrollments_lead_id ON public.campaign_enrollments(lead_id);
CREATE INDEX idx_campaign_enrollments_campaign_id ON public.campaign_enrollments(campaign_id);

-- Enable Row Level Security
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pipeline_stages (public read)
CREATE POLICY "Anyone can view pipeline stages" ON public.pipeline_stages
  FOR SELECT USING (true);

-- RLS Policies for leads
CREATE POLICY "Users can view their own leads" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- RLS Policies for campaigns (system-wide read, user-specific for custom)
CREATE POLICY "Anyone can view campaigns" ON public.campaigns
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for campaign_messages
CREATE POLICY "Anyone can view campaign messages" ON public.campaign_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_messages.campaign_id
      AND (campaigns.user_id IS NULL OR campaigns.user_id = auth.uid())
    )
  );

-- RLS Policies for campaign_enrollments
CREATE POLICY "Users can view enrollments for their leads" ON public.campaign_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = campaign_enrollments.lead_id
      AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert enrollments for their leads" ON public.campaign_enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = campaign_enrollments.lead_id
      AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update enrollments for their leads" ON public.campaign_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = campaign_enrollments.lead_id
      AND leads.user_id = auth.uid()
    )
  );

-- RLS Policies for message_templates
CREATE POLICY "Users can view their own templates" ON public.message_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates" ON public.message_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.message_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.message_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Insert seed data for pipeline_stages
INSERT INTO public.pipeline_stages (name, color, order_position) VALUES
  ('New Contact', '#3b82f6', 1),
  ('Working Lead', '#f59e0b', 2),
  ('Needs A Call', '#ef4444', 3),
  ('I Accept', '#10b981', 4);

-- Insert seed data for campaigns
INSERT INTO public.campaigns (tag, name, target_pipeline_stage_id, user_id) VALUES
  ('Ghosted', 'Ghosted Follow-up', NULL, NULL),
  ('PaymentTooHigh', 'Payment Too High Response', NULL, NULL),
  ('CreditDeclined', 'Credit Declined Follow-up', NULL, NULL),
  ('FollowUp', 'General Follow-up', NULL, NULL),
  ('DoorKnock', 'Door Knock Follow-up', NULL, NULL),
  ('NoShow', 'No Show Follow-up', NULL, NULL),
  ('WrongNumber', 'Wrong Number Response', NULL, NULL),
  ('InvalidNumber', 'Invalid Number Response', NULL, NULL),
  ('TalkingSomeoneElse', 'Talking to Someone Else', NULL, NULL),
  ('NeedsMoreInfo', 'Needs More Information', NULL, NULL),
  ('NotInterested', 'Not Interested Follow-up', NULL, NULL),
  ('Interested', 'Interested Lead Follow-up', NULL, NULL),
  ('JustLooking', 'Just Looking Follow-up', NULL, NULL),
  ('CallMeLater', 'Call Me Later Follow-up', NULL, NULL);

-- Insert seed campaign messages
INSERT INTO public.campaign_messages (campaign_id, day_number, sequence_order, message_template)
SELECT c.id, 1, 1, 'Hi {first_name}, I wanted to follow up with you regarding your recent inquiry. Are you still interested?'
FROM public.campaigns c WHERE c.tag = 'Ghosted'
UNION ALL
SELECT c.id, 3, 2, 'Just checking in again {first_name}. I have some great options that might work for you. When is a good time to chat?'
FROM public.campaigns c WHERE c.tag = 'Ghosted'
UNION ALL
SELECT c.id, 7, 3, 'Hi {first_name}, I understand you may be busy. Would love to help you when you''re ready. Let me know!'
FROM public.campaigns c WHERE c.tag = 'Ghosted'
UNION ALL
SELECT c.id, 14, 4, 'Last check-in {first_name}. If you''re still interested, I''m here to help. Otherwise, I''ll close your file for now.'
FROM public.campaigns c WHERE c.tag = 'Ghosted'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, I understand the payment was a concern. Let me see if I can find better options for you.'
FROM public.campaigns c WHERE c.tag = 'PaymentTooHigh'
UNION ALL
SELECT c.id, 2, 2, 'I''ve looked into some alternatives that might work better with your budget. Can we schedule a quick call?'
FROM public.campaigns c WHERE c.tag = 'PaymentTooHigh'
UNION ALL
SELECT c.id, 5, 3, 'Still thinking about it? I have a few more ideas that could help make this work for you.'
FROM public.campaigns c WHERE c.tag = 'PaymentTooHigh'
UNION ALL
SELECT c.id, 10, 4, 'Hi {first_name}, just wanted to reach out one more time about payment options. Let me know if you''d like to discuss.'
FROM public.campaigns c WHERE c.tag = 'PaymentTooHigh'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, I understand your credit application wasn''t approved. There may be other options available.'
FROM public.campaigns c WHERE c.tag = 'CreditDeclined'
UNION ALL
SELECT c.id, 3, 2, 'I wanted to follow up about alternative financing options that might work for your situation.'
FROM public.campaigns c WHERE c.tag = 'CreditDeclined'
UNION ALL
SELECT c.id, 7, 3, 'Hi {first_name}, we work with multiple lenders. Would you like me to explore other possibilities for you?'
FROM public.campaigns c WHERE c.tag = 'CreditDeclined'
UNION ALL
SELECT c.id, 14, 4, 'Last check-in about financing options. Let me know if you''d like to discuss further.'
FROM public.campaigns c WHERE c.tag = 'CreditDeclined'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, following up on our previous conversation. Do you have any questions I can help with?'
FROM public.campaigns c WHERE c.tag = 'FollowUp'
UNION ALL
SELECT c.id, 3, 2, 'Just checking in to see if you''ve had a chance to think things over. I''m here if you need anything.'
FROM public.campaigns c WHERE c.tag = 'FollowUp'
UNION ALL
SELECT c.id, 7, 3, 'Hi {first_name}, wanted to reach out again. Let me know if there''s anything I can help you with.'
FROM public.campaigns c WHERE c.tag = 'FollowUp'
UNION ALL
SELECT c.id, 14, 4, 'Final follow-up {first_name}. I''ll be here if you decide to move forward. Thanks!'
FROM public.campaigns c WHERE c.tag = 'FollowUp'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, great meeting you at your door! I wanted to follow up and see if you had any questions.'
FROM public.campaigns c WHERE c.tag = 'DoorKnock'
UNION ALL
SELECT c.id, 2, 2, 'Thanks again for your time today. Here''s some additional information that might be helpful.'
FROM public.campaigns c WHERE c.tag = 'DoorKnock'
UNION ALL
SELECT c.id, 5, 3, 'Hi {first_name}, just checking if you reviewed the information I left. Happy to answer any questions!'
FROM public.campaigns c WHERE c.tag = 'DoorKnock'
UNION ALL
SELECT c.id, 10, 4, 'Last follow-up from our door visit. Let me know if you''d like to discuss further!'
FROM public.campaigns c WHERE c.tag = 'DoorKnock'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, I noticed you weren''t able to make our appointment. Is everything okay?'
FROM public.campaigns c WHERE c.tag = 'NoShow'
UNION ALL
SELECT c.id, 2, 2, 'Would you like to reschedule? I have some availability this week if that works better for you.'
FROM public.campaigns c WHERE c.tag = 'NoShow'
UNION ALL
SELECT c.id, 5, 3, 'Still interested in meeting? I''d be happy to work around your schedule.'
FROM public.campaigns c WHERE c.tag = 'NoShow'
UNION ALL
SELECT c.id, 10, 4, 'Last check-in about rescheduling. Let me know if you''d still like to connect!'
FROM public.campaigns c WHERE c.tag = 'NoShow'
UNION ALL
SELECT c.id, 1, 1, 'Hi, I think I may have the wrong number. Were you inquiring about our services?'
FROM public.campaigns c WHERE c.tag = 'WrongNumber'
UNION ALL
SELECT c.id, 2, 2, 'If this is {first_name}, please let me know. Otherwise, apologies for the confusion!'
FROM public.campaigns c WHERE c.tag = 'WrongNumber'
UNION ALL
SELECT c.id, 5, 3, 'Just wanted to confirm - is this the right contact for {first_name}?'
FROM public.campaigns c WHERE c.tag = 'WrongNumber'
UNION ALL
SELECT c.id, 10, 4, 'Final attempt to reach {first_name}. If this isn''t the right number, please disregard.'
FROM public.campaigns c WHERE c.tag = 'WrongNumber'
UNION ALL
SELECT c.id, 1, 1, 'Hi, I''m having trouble reaching you at this number. Could you provide an updated contact?'
FROM public.campaigns c WHERE c.tag = 'InvalidNumber'
UNION ALL
SELECT c.id, 3, 2, 'Still unable to connect. If you see this, please send me your current phone number.'
FROM public.campaigns c WHERE c.tag = 'InvalidNumber'
UNION ALL
SELECT c.id, 7, 3, 'Trying one more time to get a valid contact number for you.'
FROM public.campaigns c WHERE c.tag = 'InvalidNumber'
UNION ALL
SELECT c.id, 14, 4, 'Unable to reach you. Please update your contact information if you''d like to continue.'
FROM public.campaigns c WHERE c.tag = 'InvalidNumber'
UNION ALL
SELECT c.id, 1, 1, 'Hi, I understand I may be speaking with someone other than the decision maker. Who should I be talking to?'
FROM public.campaigns c WHERE c.tag = 'TalkingSomeoneElse'
UNION ALL
SELECT c.id, 2, 2, 'Thanks for the info! Could you please connect me with the right person or provide their contact?'
FROM public.campaigns c WHERE c.tag = 'TalkingSomeoneElse'
UNION ALL
SELECT c.id, 5, 3, 'Following up on getting connected with the decision maker. Any updates?'
FROM public.campaigns c WHERE c.tag = 'TalkingSomeoneElse'
UNION ALL
SELECT c.id, 10, 4, 'Last follow-up about connecting with the right person. Thanks for your help!'
FROM public.campaigns c WHERE c.tag = 'TalkingSomeoneElse'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, you mentioned needing more information. What specific details can I provide?'
FROM public.campaigns c WHERE c.tag = 'NeedsMoreInfo'
UNION ALL
SELECT c.id, 2, 2, 'I''ve gathered some additional information that might help. Would you like me to send it over?'
FROM public.campaigns c WHERE c.tag = 'NeedsMoreInfo'
UNION ALL
SELECT c.id, 5, 3, 'Have you had a chance to review the information? Any other questions I can answer?'
FROM public.campaigns c WHERE c.tag = 'NeedsMoreInfo'
UNION ALL
SELECT c.id, 10, 4, 'Last check-in about the information you needed. Let me know if I can help further!'
FROM public.campaigns c WHERE c.tag = 'NeedsMoreInfo'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, I understand you''re not interested right now. Mind if I ask what changed?'
FROM public.campaigns c WHERE c.tag = 'NotInterested'
UNION ALL
SELECT c.id, 7, 2, 'Things change! Just wanted to check if your situation is different now.'
FROM public.campaigns c WHERE c.tag = 'NotInterested'
UNION ALL
SELECT c.id, 30, 3, 'Hi {first_name}, reaching out after some time. Any renewed interest?'
FROM public.campaigns c WHERE c.tag = 'NotInterested'
UNION ALL
SELECT c.id, 90, 4, 'Final check-in after a few months. Let me know if circumstances have changed!'
FROM public.campaigns c WHERE c.tag = 'NotInterested'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, great to hear you''re interested! What''s the best next step for you?'
FROM public.campaigns c WHERE c.tag = 'Interested'
UNION ALL
SELECT c.id, 2, 2, 'Following up on your interest. Do you have any questions before we move forward?'
FROM public.campaigns c WHERE c.tag = 'Interested'
UNION ALL
SELECT c.id, 5, 3, 'Just checking in - are you ready to take the next step?'
FROM public.campaigns c WHERE c.tag = 'Interested'
UNION ALL
SELECT c.id, 10, 4, 'Last follow-up on moving forward. Let me know when you''re ready!'
FROM public.campaigns c WHERE c.tag = 'Interested'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, no pressure! Take your time looking. I''m here when you have questions.'
FROM public.campaigns c WHERE c.tag = 'JustLooking'
UNION ALL
SELECT c.id, 7, 2, 'Just checking in - have you had a chance to look things over?'
FROM public.campaigns c WHERE c.tag = 'JustLooking'
UNION ALL
SELECT c.id, 14, 3, 'Hi {first_name}, wanted to see if you''re still looking or if I can provide any information.'
FROM public.campaigns c WHERE c.tag = 'JustLooking'
UNION ALL
SELECT c.id, 30, 4, 'Final check-in. Let me know if you decide to move forward with anything!'
FROM public.campaigns c WHERE c.tag = 'JustLooking'
UNION ALL
SELECT c.id, 1, 1, 'Hi {first_name}, thanks for letting me know. When would be a better time to call?'
FROM public.campaigns c WHERE c.tag = 'CallMeLater'
UNION ALL
SELECT c.id, 3, 2, 'Following up on scheduling a call. What day works best for you this week?'
FROM public.campaigns c WHERE c.tag = 'CallMeLater'
UNION ALL
SELECT c.id, 7, 3, 'Still hoping to connect with you. Let me know a good time!'
FROM public.campaigns c WHERE c.tag = 'CallMeLater'
UNION ALL
SELECT c.id, 14, 4, 'Last attempt to schedule a call. Reach out when you''re available!'
FROM public.campaigns c WHERE c.tag = 'CallMeLater';