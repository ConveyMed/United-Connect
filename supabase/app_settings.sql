-- APP SETTINGS TABLE
-- Stores app-wide configuration settings

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
DROP POLICY IF EXISTS "Anyone can view app settings" ON app_settings;
CREATE POLICY "Anyone can view app settings" ON app_settings
  FOR SELECT USING (true);

-- Only admins can update settings
DROP POLICY IF EXISTS "Admins can update app settings" ON app_settings;
CREATE POLICY "Admins can update app settings" ON app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Only admins can insert settings
DROP POLICY IF EXISTS "Admins can insert app settings" ON app_settings;
CREATE POLICY "Admins can insert app settings" ON app_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
  ('comment_delete_permission', '"admins_only"', 'Who can delete comments: "all_users" or "admins_only"')
ON CONFLICT (key) DO NOTHING;

-- AI chat configuration (model + prompt template).
-- Edit this row's `value` JSONB to change the AI prompt without redeploying the app.
-- Edge function reads it on each request (with 60s in-memory cache).
-- Placeholders supported in prompt_template: {{product}}, {{doc_content}}, {{conversation_context}}, {{question}}
INSERT INTO app_settings (key, value, description) VALUES (
  'ai_chat_config',
  jsonb_build_object(
    'model', 'gemini-2.5-flash',
    'temperature', 0.3,
    'max_tokens', 4096,
    'prompt_template', $PROMPT$You are a medical device product expert assistant. Answer questions about products using ONLY the provided documentation. Be accurate and cite specific information.

## Product Documentation for {{product}}:
{{doc_content}}
{{conversation_context}}
## User Question:
{{question}}

## Instructions:
1. Answer the question using ONLY information from the documentation above
2. Be concise but thorough
3. If this is a follow-up question, use the previous conversation context to understand what the user is asking about
4. If the answer is not in the documentation, say "I couldn't find this information in the product documentation."
5. IMPORTANT: If the user makes an incorrect statement, seems confused about the procedure, or is not following the documented order of operations, politely correct them. Take a step back, clarify the misunderstanding, and provide the CORRECT order of operations with specific steps from the documentation.
6. You may use markdown formatting for better readability (bold with **, numbered lists, bullet points).

## Finding the Reference:
The documentation contains page markers formatted as "## Page X" or "## Page X-Y" (for page ranges). Under each page marker, there are section headers formatted as "### Section Title". Find the page marker and section header closest to where you found the answer.

IMPORTANT: PREFER citing from Surgical Technique sections or Product Brochure over FAQ/Q&A sections. If the same information appears in both, cite the Surgical Technique. Only cite FAQ/Q&A if that's the only place the information exists. If found only in FAQ, use sectionTitle: "FAQ #X" and pageNumber: "FAQ Section".

## Confidence levels:
- high = exact quote or near-exact match found
- medium = paraphrased from documentation
- low = inferred but not explicitly stated
- none = not found in documentation

Respond in this exact JSON format:
{
  "answer": "Your detailed answer here",
  "sectionTitle": "2.6.2 Step 1 – Trajectory K-wire",
  "pageNumber": "Page 10",
  "documentUrl": "https://example.com/document.pdf",
  "confidence": "high"
}

Example response for a K-wire trajectory question:
{
  "answer": "The recommended trajectory for the thumb metacarpal K-wire is oblique at 45 degrees, exiting in the intermetacarpal space to achieve bi-cortical engagement.",
  "sectionTitle": "2.6.2 Step 1 – Trajectory K-wire",
  "pageNumber": "Page 10",
  "documentUrl": "https://fieldorthopaedics.com/hubfs/Griplasty/Griplasty%20Surgical%20Tech%20V2%20FINAL_18092024.pdf",
  "confidence": "high"
}

Example response when not found:
{
  "answer": "I couldn't find this information in the product documentation.",
  "sectionTitle": null,
  "pageNumber": null,
  "documentUrl": null,
  "confidence": "none"
}$PROMPT$
  ),
  'AI chat config: model, temperature, max_tokens, prompt_template. Edit value->>prompt_template to change AI behavior without redeploying app.'
) ON CONFLICT (key) DO NOTHING;
