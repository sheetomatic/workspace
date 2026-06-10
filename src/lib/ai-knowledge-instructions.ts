export type KnowledgeInstructionBlock = {
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
};

export const AI_KNOWLEDGE_OVERVIEW: KnowledgeInstructionBlock = {
  title: "How AI Training Data works",
  summary:
    "Articles you add here become your WhatsApp AI knowledge base. Active items also appear as tappable options in the customer WhatsApp menu (Browse topics).",
  steps: [
    "Add training resources as FAQ articles, documents, synced website pages, or your YouTube channel.",
    "Each saved item appears in the Articles table and up to 10 items show in the WhatsApp menu.",
    "Customers tap a topic to get the answer instantly, or type a free-form question.",
    "Add your YouTube channel so customers can get video links from WhatsApp.",
    "Go Live from Campaign so the KB Search Agent and WhatsApp menu are active.",
    "When you add or remove articles, the WhatsApp menu updates on the next Browse topics tap.",
  ],
  tips: [
    "Start with 5-10 FAQs for pricing, hours, shipping, and returns.",
    "Sync your pricing and policy pages from your public website.",
    "Add your YouTube channel URL so customers can ask for tutorial video links.",
    "Re-sync website and channel articles after you publish new content.",
  ],
};

export const AI_KNOWLEDGE_TAB_INSTRUCTIONS: Record<
  "articles" | "unanswered" | "needs-improvement",
  KnowledgeInstructionBlock
> = {
  articles: {
    title: "Articles",
    summary:
      "All active training sources live here. Up to 10 items appear as interactive WhatsApp menu options when customers tap Browse topics.",
    steps: [
      "Click + Add and choose FAQ article, Document upload, Website sync, or YouTube channel.",
      "Fill the form and save. The new row appears in this table and in the WhatsApp menu preview.",
      "Customers tap a menu row to get that article answer instantly on WhatsApp.",
      "Channel videos appear first in the menu so customers can get tutorial links quickly.",
      "Use refresh on website or channel rows after updates. Remove old articles so they leave the menu.",
    ],
    tips: [
      "One FAQ = one customer question and one approved answer.",
      "Documents work best for brochures, price lists, and policy PDFs.",
    ],
  },
  unanswered: {
    title: "Unanswered questions",
    summary:
      "This tab will list customer questions the AI could not answer from your training data, so you can turn them into new articles.",
    steps: [
      "Keep AI live on WhatsApp and add your core FAQs first.",
      "When a question has no matching article, it will show here (coming soon).",
      "Review the question, click Add, and create a new FAQ or document.",
      "The AI will use the new article on the next similar customer message.",
    ],
    tips: [
      "Check this tab weekly to close gaps in your knowledge base.",
    ],
  },
  "needs-improvement": {
    title: "Needs improvement",
    summary:
      "Articles flagged from low-confidence AI replies or team feedback will appear here for review.",
    steps: [
      "Open Chats and check replies where the AI seemed unsure or wrong.",
      "Update the matching article or add a clearer FAQ.",
      "Remove conflicting or outdated articles so answers stay consistent.",
      "Flagged items will list here automatically (coming soon).",
    ],
    tips: [
      "Short, specific answers work better than long paragraphs on WhatsApp.",
    ],
  },
};

export const AI_KNOWLEDGE_ADD_INSTRUCTIONS: Record<
  "faq" | "document" | "website" | "youtube",
  KnowledgeInstructionBlock
> = {
  faq: {
    title: "FAQ article",
    summary:
      "Best for quick answers customers ask often: pricing, delivery, appointments, refunds, and support hours.",
    steps: [
      "Write the question exactly as customers ask it on WhatsApp.",
      "Write the answer you want the AI to send. Keep it factual and complete.",
      "Click Save FAQ. The item is stored as an Active article immediately.",
      "Test by messaging your business number after Go Live.",
    ],
    tips: [
      "Add separate FAQs for each topic instead of one long answer.",
      "Include amounts, timings, and links customers need in the answer text.",
    ],
  },
  document: {
    title: "Document upload",
    summary:
      "Upload PDF, DOCX, TXT, MD, or CSV files, or paste text. Sheetomatic can auto-generate FAQ articles from the extracted content.",
    steps: [
      "Upload a file or paste content into the text box (one method is enough).",
      "Keep Generate FAQs checked to create WhatsApp menu options automatically.",
      "Sheetomatic saves the document and creates FAQ articles from facts in the text.",
      "Use the sparkles icon on any document row to regenerate FAQs later.",
    ],
    tips: [
      "Use clear headings inside documents so extracted text stays readable.",
      "Prefer PDFs with selectable text, not scanned images without OCR.",
    ],
  },
  website: {
    title: "Website sync",
    summary:
      "Pull readable text from a public page on your website and auto-generate FAQs for the WhatsApp menu.",
    steps: [
      "Paste a full public URL (must start with https://).",
      "Keep Generate FAQs checked to create customer menu options from the page.",
      "Click Sync website. Sheetomatic saves the page and generates FAQ articles.",
      "Re-sync or tap the sparkles icon after you update content on your site.",
    ],
    tips: [
      "The page must be publicly reachable (no login wall).",
      "One URL = one article. Sync each important page separately.",
    ],
  },
  youtube: {
    title: "YouTube channel",
    summary:
      "Sync your public YouTube channel so customers can get video links on WhatsApp from Browse topics or Channel videos.",
    steps: [
      "Paste your channel URL (for example https://www.youtube.com/@Sheetomatic) or @handle.",
      "Keep Generate FAQs checked to create menu options for common video questions.",
      "Click Sync channel. Sheetomatic saves recent video titles and links.",
      "Re-sync after you publish new videos so the list stays current.",
    ],
    tips: [
      "Customers can also type questions like \"send me the Excel tutorial video\".",
      "The channel appears in the WhatsApp menu as Channel videos.",
    ],
  },
};

export const AI_CAMPAIGN_INSTRUCTIONS: KnowledgeInstructionBlock = {
  title: "How to use Campaign insights",
  summary:
    "View bulk WhatsApp CSV campaign delivery stats from RedLava — same metrics and tables as the RedLava reporting panel, inside Sheetomatic.",
  steps: [
    "Connect RedLava API key and Phone ID in Settings, then sync approved templates.",
    "Create CSV campaigns in RedLava (upload contacts, pick template, schedule send).",
    "Return here and click Refresh campaigns to pull the latest list from RedLava.",
    "Pick a campaign from the dropdown to load CSV file status, Meta delivery metrics, and row tables.",
    "Use Campaign table for upload/acceptance results per contact; Message table for delivery statuses.",
    "Click a metric card to filter the active table; use Download CSV to export all rows.",
  ],
  tips: [
    "Hard-refresh if metrics look stale after a send completes in RedLava.",
    "Rejected rows usually mean invalid numbers or template variable mismatches in the CSV.",
    "Go Live from this page activates your AI knowledge menu on WhatsApp.",
  ],
};

export const AI_KNOWLEDGE_ADD_MENU_HINTS: Record<
  "faq" | "document" | "website" | "youtube",
  string
> = {
  faq: "Question and answer pairs for common customer queries",
  document: "PDF, DOCX, or pasted text from brochures and policies",
  website: "Pull content from a public page on your site",
  youtube: "Share video links from your YouTube channel on WhatsApp",
};
