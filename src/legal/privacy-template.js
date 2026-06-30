// Privacy Policy Template
// Replace company info with client details

export const getPrivacyContent = ({ companyName, companyAddress, companyEmail }) => `
PRIVACY POLICY
Last Updated: {{DATE}}

${companyName} ("we," "our," or "us") respects your privacy. This Privacy Policy describes how we collect, use, and share information when you use our mobile application (the "App"). We partner with Convey Pro Inc., who acts as our data processor and technology provider to host and operate the App on our behalf.

By downloading or using the App, you agree to the terms of this Privacy Policy.

1. INFORMATION WE COLLECT
We collect information to provide you with a secure, customized, and efficient experience. The categories of data we collect include:

A. Information You Provide to Us
- Account Information: When you register or log in, we collect your Name, Email Address, Phone Number, and Job Title/Role.
- User Content: Any text, images, or files you voluntarily upload to the App for sharing with your organization.
- AI Interactions: Text prompts, queries, and questions you submit to our AI Agent features.

B. Information Collected Automatically
- Usage Data: We track how you interact with the App, including screens visited, time spent, and features used (e.g., search queries, video views).
- Device Information: We collect technical details such as your device model, operating system version, unique device identifiers (e.g., IDFV or Android ID), and IP address.
- Crash & Performance Data: Logs related to App crashes or performance issues to help fix bugs.

2. HOW WE USE YOUR INFORMATION
We use the collected information for the following business purposes:
- Service Delivery: To authenticate your identity.
- Communication: To send you push notifications, updates, or important administrative messages.
- App Improvement: To analyze usage trends and fix technical issues.
- AI Features: To process your questions via our AI Agent and provide automated answers regarding product information.

3. AI FEATURES & DATA SHARING
This App contains AI-powered features designed to assist you with product queries. To provide these features, specific data is shared with our third-party AI provider.
- What is Shared: Only the text prompts you explicitly submit to the AI Agent are sent to our AI provider, Google AI Studio. We do not send your user profile or contact details to the AI provider.
- Consent: You have control over this sharing. Data is only transmitted to the AI provider when you actively engage with the AI Agent feature.
- No Training: Because we utilize Google AI Studio as a paid enterprise service, we have ensured through our service agreements that your text prompts and queries are not used to train their public foundation models.

4. DATA SHARING WITH THIRD PARTIES
We do not sell your personal data. We share data with Convey Pro Inc. and the following service providers who assist in operating the App:

| Service Provider | Function | Data Shared |
|-----------------|----------|-------------|
| Supabase | Backend Database & Authentication | User Profile (Name, Email), App Content, Usage Logs |
| Netlify | Web Hosting & Content Delivery | IP Address, Browser/Device User Agent |
| Gemini | LLM / AI Processing | User Prompts/Queries (Text Input) |
| Google/Apple | App Store Distribution | App Performance Analytics (Anonymous) |

5. DATA RETENTION & DELETION
- Retention: We retain your account data for as long as your organization's license is active or as required by law.
- Deletion: You may request the deletion of your account and associated data at any time using the "Delete Account" feature within the App settings.

6. SECURITY
Industry-standard security measures are implemented to protect your data, including:
- Encryption: Data is encrypted in transit (TLS/SSL) and at rest within the database (Supabase).
- Access Controls: Only authorized personnel have access to the production environment.
- Vulnerability Monitoring: Code repositories (GitHub) and dependencies are actively monitored for security vulnerabilities.
- However, no method of transmission over the Internet is 100% secure.

7. YOUR RIGHTS
Depending on your location, you may have the following rights:
- Access: Request a copy of the personal data we hold about you.
- Correction: Request corrections to inaccurate data.
- Deletion: Request permanent deletion of your data.
- Opt-Out: You may opt out of AI features by strictly avoiding the use of the AI Agent tab within the App.

To exercise these rights, please submit a request to our technology provider here: https://www.cognitoforms.com/ConveyProInc/DataRequest.

8. CHILDREN'S PRIVACY
The App is a B2B business tool intended for professionals. We do not knowingly collect data from children under the age of 13. If you believe a child has provided us with personal data, please contact us immediately.

9. CONTACT US
If you have questions about this Privacy Policy, please contact the Company at:
${companyName}
${companyAddress}
${companyEmail}

For technical data inquiries, submit a request here: https://www.cognitoforms.com/ConveyProInc/DataRequest.
`;
