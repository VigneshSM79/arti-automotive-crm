export interface CampaignMessage {
  day: number;
  content: string;
}

export interface CampaignTemplate {
  name: string;
  identifier: string;
  messages: CampaignMessage[];
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // Drip Sequences
  {
    name: "Ghosted / No Response",
    identifier: "Ghosted",
    messages: [
      { day: 1, content: "Hey, just checking in. Are you still exploring vehicle options or did plans change?" },
      { day: 2, content: "I’ve got a couple options that fit what you were originally looking for. Want me to send them over?" },
      { day: 4, content: "If the right payment and the right vehicle came up, would you be open to taking another look?" },
      { day: 6, content: "Before I close out your file, want me to keep sending options or pause it for now?" }
    ]
  },
  {
    name: "Payment Too High",
    identifier: "Payment_Issue",
    messages: [
      { day: 1, content: "Good timing. Some payments on the vehicles you liked have come down. Want updated numbers?" },
      { day: 2, content: "I can structure things differently now. Sometimes a small adjustment solves the payment issue. Want me to show you?" },
      { day: 4, content: "If I could get you closer to your ideal monthly payment, would you want to reopen the conversation?" },
      { day: 6, content: "I don’t want you to miss a lower payment if it’s available. Should I run a new quote for you?" }
    ]
  },
  {
    name: "Credit Declined Previously",
    identifier: "Credit_Declined",
    messages: [
      { day: 1, content: "We have updated lenders for challenged credit. Want me to take another shot at approvals?" },
      { day: 2, content: "Some lenders are approving situations similar to yours from the last couple of weeks. Want me to check again?" },
      { day: 4, content: "I can try to get you approved without increasing your payment. Should I recheck it?" },
      { day: 6, content: "This is the best window we’ve had lately for approvals. Want me to run a fresh one before I close the file?" }
    ]
  },
  {
    name: "Waiting / Timing Not Right",
    identifier: "Timing_Issue",
    messages: [
      { day: 1, content: "You mentioned timing wasn’t right earlier. Just checking in to see if things have changed." },
      { day: 3, content: "Inventory and rates shifted a bit, which sometimes makes the timing better. Want to see what’s available now?" },
      { day: 5, content: "If the right deal came up earlier than expected, would you want me to send it to you?" },
      { day: 7, content: "I can keep you updated only when something perfect shows up. Want me to set that up?" }
    ]
  },
  {
    name: "Couldn’t Find the Right Vehicle",
    identifier: "Inventory_Issue",
    messages: [
      { day: 1, content: "New inventory just arrived that fits what you originally wanted. Want me to send options?" },
      { day: 2, content: "I think I found a couple vehicles that match your wishlist more closely. Want to see them?" },
      { day: 4, content: "I can search manually for you every morning if you want. What’s the one non-negotiable feature?" },
      { day: 6, content: "Before I close your file, want me to send the newest arrivals that might be a fit?" }
    ]
  },
  {
    name: "Needed More Info / Confusion",
    identifier: "More_Info",
    messages: [
      { day: 1, content: "I can break everything down simply. Which part do you want clarity on first?" },
      { day: 2, content: "I can send you a clean breakdown of payment, rate, warranty and all costs if you’d like." },
      { day: 4, content: "Most people are surprised how simple the numbers look once I outline everything. Want me to send the summary?" },
      { day: 6, content: "Just checking in. Want a clear all-in breakdown before I close this file?" }
    ]
  },
  {
    name: "Process Took Too Long",
    identifier: "Process_Delay",
    messages: [
      { day: 1, content: "Good news. The approval process is much faster now. Want me to reopen your file?" },
      { day: 3, content: "We fixed the delays from last time. I can get you results way quicker now." },
      { day: 5, content: "I can fast-track your file personally if timing was the issue. Want to restart?" },
      { day: 7, content: "I can submit your file immediately if you’re ready. Want me to go ahead?" }
    ]
  },
  {
    name: "Bought Elsewhere",
    identifier: "Lost_Sale",
    messages: [
      { day: 1, content: "Congrats on the purchase! Anything I could improve for next time?" },
      { day: 3, content: "If the rate was higher than you wanted, I can check refinancing options anytime." },
      { day: 10, content: "Whenever you’re thinking upgrade or second vehicle, I’m always here to help." },
      { day: 30, content: "Hope the vehicle is treating you well. If anything changes, just message me anytime." }
    ]
  },
  {
    name: "Wanted to Improve Credit First",
    identifier: "Credit_Improvement",
    messages: [
      { day: 1, content: "Some lenders approve earlier in the rebuilding process. Want me to recheck your options?" },
      { day: 3, content: "I can look at credit-friendly programs for you. Chances are better right now." },
      { day: 5, content: "If I can get you approved without hurting your credit score, should I try again?" },
      { day: 7, content: "I can rerun your file anytime with no pressure. Want me to try once more?" }
    ]
  },
  {
    name: "Negative Equity / Trade-In Issue",
    identifier: "Negative_Equity",
    messages: [
      { day: 1, content: "We have stronger programs for negative equity now. Want me to rework your trade numbers?" },
      { day: 2, content: "I might be able to reduce the amount rolling into the new loan. Want me to check?" },
      { day: 4, content: "I found a couple ways to soften the trade hit. Want to see what’s available?" },
      { day: 6, content: "Last call before I close your file. Want me to see if your trade position improved?" }
    ]
  },
  {
    name: "Needed a Cosigner",
    identifier: "Cosigner_Needed",
    messages: [
      { day: 1, content: "If you’re still considering a cosigner, I can re-run the joint approval." },
      { day: 3, content: "Lenders are being more flexible on cosigned apps right now. Want me to try again?" },
      { day: 5, content: "I can try to get you approved with or without a cosigner. Want me to look at both options?" },
      { day: 7, content: "Before I close your file, should I try one last approval with the updated programs?" }
    ]
  },
  {
    name: "Didn’t Like the Approved Vehicle",
    identifier: "Vehicle_Dislike",
    messages: [
      { day: 1, content: "New options came in that might fit your style better. Want to see them?" },
      { day: 3, content: "If I can find something closer to what you expected, should I send choices?" },
      { day: 5, content: "We now have more vehicles approved for similar credit profiles. Want me to check?" },
      { day: 7, content: "Want me to keep you updated only when better matches come in?" }
    ]
  },
  {
    name: "Rate Too High",
    identifier: "Rate_Issue",
    messages: [
      { day: 1, content: "Rates dropped with a few lenders. Want me to recheck yours?" },
      { day: 2, content: "I might be able to get you a better rate now. Want me to run the new numbers?" },
      { day: 4, content: "If rate was the only concern, I can try to bring it down. Should I take a look?" },
      { day: 6, content: "Want me to run one last check on the updated rates before I close this file?" }
    ]
  },
  {
    name: "Missing Documents",
    identifier: "Missing_Docs",
    messages: [
      { day: 1, content: "If you have the documents now, I can reopen your approval. Want to try again?" },
      { day: 2, content: "I can walk you through the document list step by step so it’s easy." },
      { day: 4, content: "If documents were the issue, I can simplify the process. Want me to send the list again?" },
      { day: 6, content: "Just checking in. Do you want help gathering the documents so we can continue?" }
    ]
  },

  // Pivot Scripts (Single Message)
  {
    name: "Personal Loan -> Auto Loan Pivot",
    identifier: "Pivot_Personal",
    messages: [
      { day: 1, content: "Many clients who were looking at personal loans ended up qualifying easier for an auto loan, often with better monthly payment options. We work with lenders who approve a wide range of credit situations. Want me to check what you qualify for?" }
    ]
  },
  {
    name: "Mortgage -> Auto Loan Pivot",
    identifier: "Pivot_Mortgage",
    messages: [
      { day: 1, content: "Some clients waiting on mortgage decisions found that an auto loan was simpler to approve and helped stabilize their monthly budget. Our lenders often approve quicker with lower entry requirements. Want me to show you your auto loan options?" }
    ]
  },
  {
    name: "Debt Collection -> Auto Loan Pivot",
    identifier: "Pivot_Collection",
    messages: [
      { day: 1, content: "We work with lenders who offer auto loans even for clients managing past-due accounts, and many find the payments surprisingly manageable. If transportation is something you’re organizing, I can show flexible approval options that fit your situation." }
    ]
  },
  {
    name: "Debt Consolidation -> Auto Loan Pivot",
    identifier: "Pivot_Consolidation",
    messages: [
      { day: 1, content: "Many clients exploring consolidation discovered that an auto loan gave them a lower, more predictable monthly payment. Our programs include flexible approvals with competitive terms. Want me to check what you’d qualify for?" }
    ]
  },
  {
    name: "Credit Repair -> Auto Loan Pivot",
    identifier: "Pivot_CreditRepair",
    messages: [
      { day: 1, content: "We help many people in the middle of rebuilding their credit get approved for auto loans sooner than expected. It can even help strengthen your profile long term. Want me to check your updated approval options?" }
    ]
  },
  {
    name: "Auto Refinance -> New Auto Loan Pivot",
    identifier: "Pivot_Refinance",
    messages: [
      { day: 1, content: "Some clients looking to refinance found that upgrading into a newer vehicle actually gave them better terms and a more comfortable payment. Our lenders have strong programs for trades and transitions. Want me to show you what’s available?" }
    ]
  }
];
