-- Migration: Reset and Rebuild All Tag Campaigns
-- Created: 2025-11-29
-- Description: Deletes all existing tag campaigns (except Initial_Message) and recreates them with correct sequences from campaigns.md

-- Step 1: Delete all existing tag campaigns except Initial_Message
DELETE FROM tag_campaign_messages
WHERE campaign_id IN (
  SELECT id FROM tag_campaigns WHERE tag != 'Initial_Message'
);

DELETE FROM tag_campaigns
WHERE tag != 'Initial_Message';

-- Step 2: Insert all 14 objection handling campaigns + 6 pivot campaigns

-- Campaign 1: Ghosted / No Response
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Ghosted', 'Ghosted / No Response', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'Hey {first_name}, just checking in. Are you still exploring vehicle options or did plans change?'),
    (campaign_id, 2, 2, 'I''ve got a couple options that fit what you were originally looking for. Want me to send them over?'),
    (campaign_id, 4, 3, 'If the right payment and the right vehicle came up, would you be open to taking another look?'),
    (campaign_id, 6, 4, 'Before I close out your file, want me to keep sending options or pause it for now?');
END $$;

-- Campaign 2: Payment Too High
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Payment_Too_High', 'Payment Too High', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'Good timing. Some payments on the vehicles you liked have come down. Want updated numbers?'),
    (campaign_id, 2, 2, 'I can structure things differently now. Sometimes a small adjustment solves the payment issue. Want me to show you?'),
    (campaign_id, 4, 3, 'If I could get you closer to your ideal monthly payment, would you want to reopen the conversation?'),
    (campaign_id, 6, 4, 'I don''t want you to miss a lower payment if it''s available. Should I run a new quote for you?');
END $$;

-- Campaign 3: Credit Declined Previously
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Credit_Declined_Previously', 'Credit Declined Previously', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'We have updated lenders for challenged credit. Want me to take another shot at approvals?'),
    (campaign_id, 2, 2, 'Some lenders are approving situations similar to yours from the last couple of weeks. Want me to check again?'),
    (campaign_id, 4, 3, 'I can try to get you approved without increasing your payment. Should I recheck it?'),
    (campaign_id, 6, 4, 'This is the best window we''ve had lately for approvals. Want me to run a fresh one before I close the file?');
END $$;

-- Campaign 4: Waiting / Timing Not Right
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Waiting_Timing_Not_Right', 'Waiting / Timing Not Right', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'You mentioned timing wasn''t right earlier. Just checking in to see if things have changed.'),
    (campaign_id, 3, 2, 'Inventory and rates shifted a bit, which sometimes makes the timing better. Want to see what''s available now?'),
    (campaign_id, 5, 3, 'If the right deal came up earlier than expected, would you want me to send it to you?'),
    (campaign_id, 7, 4, 'I can keep you updated only when something perfect shows up. Want me to set that up?');
END $$;

-- Campaign 5: Couldn't Find the Right Vehicle
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Couldnt_Find_Right_Vehicle', 'Couldn''t Find the Right Vehicle', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'New inventory just arrived that fits what you originally wanted. Want me to send options?'),
    (campaign_id, 2, 2, 'I think I found a couple vehicles that match your wishlist more closely. Want to see them?'),
    (campaign_id, 4, 3, 'I can search manually for you every morning if you want. What''s the one non-negotiable feature?'),
    (campaign_id, 6, 4, 'Before I close your file, want me to send the newest arrivals that might be a fit?');
END $$;

-- Campaign 6: Needed More Info / Confusion About Terms
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Needed_More_Info', 'Needed More Info / Confusion About Terms', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'I can break everything down simply. Which part do you want clarity on first?'),
    (campaign_id, 2, 2, 'I can send you a clean breakdown of payment, rate, warranty and all costs if you''d like.'),
    (campaign_id, 4, 3, 'Most people are surprised how simple the numbers look once I outline everything. Want me to send the summary?'),
    (campaign_id, 6, 4, 'Just checking in. Want a clear all-in breakdown before I close this file?');
END $$;

-- Campaign 7: Process Took Too Long
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Process_Took_Too_Long', 'Process Took Too Long', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'Good news. The approval process is much faster now. Want me to reopen your file?'),
    (campaign_id, 3, 2, 'We fixed the delays from last time. I can get you results way quicker now.'),
    (campaign_id, 5, 3, 'I can fast-track your file personally if timing was the issue. Want to restart?'),
    (campaign_id, 7, 4, 'I can submit your file immediately if you''re ready. Want me to go ahead?');
END $$;

-- Campaign 8: Bought Elsewhere (special timing: 1, 3, 10, 30)
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Bought_Elsewhere', 'Bought Elsewhere', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'Congrats on the purchase! Anything I could improve for next time?'),
    (campaign_id, 3, 2, 'If the rate was higher than you wanted, I can check refinancing options anytime.'),
    (campaign_id, 10, 3, 'Whenever you''re thinking upgrade or second vehicle, I''m always here to help.'),
    (campaign_id, 30, 4, 'Hope the vehicle is treating you well. If anything changes, just message me anytime.');
END $$;

-- Campaign 9: Wanted to Improve Credit First
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Improve_Credit_First', 'Wanted to Improve Credit First', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'Some lenders approve earlier in the rebuilding process. Want me to recheck your options?'),
    (campaign_id, 3, 2, 'I can look at credit-friendly programs for you. Chances are better right now.'),
    (campaign_id, 5, 3, 'If I can get you approved without hurting your credit score, should I try again?'),
    (campaign_id, 7, 4, 'I can rerun your file anytime with no pressure. Want me to try once more?');
END $$;

-- Campaign 10: Negative Equity / Trade-In Issue
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Negative_Equity', 'Negative Equity / Trade-In Issue', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'We have stronger programs for negative equity now. Want me to rework your trade numbers?'),
    (campaign_id, 2, 2, 'I might be able to reduce the amount rolling into the new loan. Want me to check?'),
    (campaign_id, 4, 3, 'I found a couple ways to soften the trade hit. Want to see what that looks like?'),
    (campaign_id, 6, 4, 'Last call before I close your file. Want me to see if your trade position improved?');
END $$;

-- Campaign 11: Needed a Cosigner
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Needed_Cosigner', 'Needed a Cosigner', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'If you''re still considering a cosigner, I can re-run the joint approval.'),
    (campaign_id, 3, 2, 'Lenders are being more flexible on cosigned apps right now. Want me to try again?'),
    (campaign_id, 5, 3, 'I can try to get you approved with or without a cosigner. Want me to look at both options?'),
    (campaign_id, 7, 4, 'Before I close your file, should I try one last approval with the updated programs?');
END $$;

-- Campaign 12: Didn't Like the Approved Vehicle
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Didnt_Like_Approved_Vehicle', 'Didn''t Like the Approved Vehicle', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'New options came in that might fit your style better. Want to see them?'),
    (campaign_id, 3, 2, 'If I can find something closer to what you expected, should I send choices?'),
    (campaign_id, 5, 3, 'We now have more vehicles approved for similar credit profiles. Want me to check?'),
    (campaign_id, 7, 4, 'Want me to keep you updated only when better matches come in?');
END $$;

-- Campaign 13: Rate Too High
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Rate_Too_High', 'Rate Too High', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'Rates dropped with a few lenders. Want me to recheck yours?'),
    (campaign_id, 2, 2, 'I might be able to get you a better rate now. Want me to run the new numbers?'),
    (campaign_id, 4, 3, 'If rate was the only concern, I can try to bring it down. Should I take a look?'),
    (campaign_id, 6, 4, 'Want me to run one last check on the updated rates before I close this file?');
END $$;

-- Campaign 14: Missing Documents
DO $$
DECLARE campaign_id UUID;
BEGIN
  INSERT INTO tag_campaigns (tag, name, is_active)
  VALUES ('Missing_Documents', 'Missing Documents', true)
  RETURNING id INTO campaign_id;

  INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
  VALUES
    (campaign_id, 1, 1, 'If you have the documents now, I can reopen your approval. Want to try again?'),
    (campaign_id, 2, 2, 'I can walk you through the document list step by step so it''s easy.'),
    (campaign_id, 4, 3, 'If documents were the issue, I can simplify the process. Want me to send the list again?'),
    (campaign_id, 6, 4, 'Just checking in. Do you want help gathering the documents so we can continue?');
END $$;

-- Campaign 15: Personal Loan → Auto Loan Pivot (single message)
INSERT INTO tag_campaigns (tag, name, is_active)
VALUES ('Personal_Loan_Pivot', 'Personal Loan → Auto Loan Pivot', true);

INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
SELECT id, 1, 1, 'Many clients who were looking at personal loans ended up qualifying easier for an auto loan, often with better monthly payment options. We work with lenders who approve a wide range of credit situations. Want me to check what you qualify for?'
FROM tag_campaigns WHERE tag = 'Personal_Loan_Pivot';

-- Campaign 16: Mortgage → Auto Loan Pivot (single message)
INSERT INTO tag_campaigns (tag, name, is_active)
VALUES ('Mortgage_Pivot', 'Mortgage → Auto Loan Pivot', true);

INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
SELECT id, 1, 1, 'Some clients waiting on mortgage decisions found that an auto loan was simpler to approve and helped stabilize their monthly budget. Our lenders often approve quicker with lower entry requirements. Want me to show you your auto loan options?'
FROM tag_campaigns WHERE tag = 'Mortgage_Pivot';

-- Campaign 17: Debt Collection → Auto Loan Pivot (single message)
INSERT INTO tag_campaigns (tag, name, is_active)
VALUES ('Debt_Collection_Pivot', 'Debt Collection → Auto Loan Pivot', true);

INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
SELECT id, 1, 1, 'We work with lenders who offer auto loans even for clients managing past-due accounts, and many find the payments surprisingly manageable. If transportation is something you''re organizing, I can show flexible approval options that fit your situation.'
FROM tag_campaigns WHERE tag = 'Debt_Collection_Pivot';

-- Campaign 18: Debt Consolidation → Auto Loan Pivot (single message)
INSERT INTO tag_campaigns (tag, name, is_active)
VALUES ('Debt_Consolidation_Pivot', 'Debt Consolidation → Auto Loan Pivot', true);

INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
SELECT id, 1, 1, 'Many clients exploring consolidation discovered that an auto loan gave them a lower, more predictable monthly payment. Our programs include flexible approvals with competitive terms. Want me to check what you''d qualify for?'
FROM tag_campaigns WHERE tag = 'Debt_Consolidation_Pivot';

-- Campaign 19: Credit Repair → Auto Loan Pivot (single message)
INSERT INTO tag_campaigns (tag, name, is_active)
VALUES ('Credit_Repair_Pivot', 'Credit Repair → Auto Loan Pivot', true);

INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
SELECT id, 1, 1, 'We help many people in the middle of rebuilding their credit get approved for auto loans sooner than expected. It can even help strengthen your profile long term. Want me to check your updated approval options?'
FROM tag_campaigns WHERE tag = 'Credit_Repair_Pivot';

-- Campaign 20: Auto Refinance → New Auto Loan Pivot (single message)
INSERT INTO tag_campaigns (tag, name, is_active)
VALUES ('Auto_Refinance_Pivot', 'Auto Refinance → New Auto Loan Pivot', true);

INSERT INTO tag_campaign_messages (campaign_id, day_number, sequence_order, message_template)
SELECT id, 1, 1, 'Some clients looking to refinance found that upgrading into a newer vehicle actually gave them better terms and a more comfortable payment. Our lenders have strong programs for trades and transitions. Want me to show you what''s available?'
FROM tag_campaigns WHERE tag = 'Auto_Refinance_Pivot';

-- Verify all campaigns were created
SELECT
  tc.tag,
  tc.name,
  COUNT(tcm.id) as message_count
FROM tag_campaigns tc
LEFT JOIN tag_campaign_messages tcm ON tc.id = tcm.campaign_id
WHERE tc.tag != 'Initial_Message'
GROUP BY tc.tag, tc.name
ORDER BY tc.name;
