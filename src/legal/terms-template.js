// Terms of Service Template
// Replace {{COMPANY_NAME}}, {{COMPANY_ADDRESS}}, {{COMPANY_EMAIL}}, {{COMPANY_STATE}} with client info

export const getTermsContent = ({ companyName, companyAddress, companyEmail, companyState }) => `
TERMS OF SERVICE
Last Updated: {{DATE}}

Welcome to the ${companyName} mobile application.

This app is provided by ${companyName} ("Company", "we", "us", or "our"). We partner with Convey Pro Inc. ("Technology Platform Provider") to host and operate this application.

These Terms of Service ("Terms") govern your access to and use of the App. By downloading, accessing, or using the App, you agree to be bound by these Terms. If you are using the App on behalf of an organization (such as your employer), you agree to these Terms on behalf of that organization.

1. THE SERVICE
The App is a platform designed to make available content for consumption for business purposes to employees, agents, distributors, and other authorized personnel. Your access is granted pursuant to your relationship with the Company.

2. LICENSE GRANT & RESTRICTIONS
We grant you a limited, non-exclusive, non-transferable, and revocable license to use the App for your internal business purposes. You agree NOT to:
- Copy, modify, or create derivative works of the App.
- Reverse engineer, decompile, or attempt to extract the source code of the App.
- Sublicense, sell, or transfer your access to the App to any unauthorized third party.
- Use the App for any illegal, unauthorized, or abusive purpose.

3. ARTIFICIAL INTELLIGENCE (AI) FEATURES & DISCLAIMERS
The App may include an AI Agent designed to serve as a product expert. By using the AI features, you acknowledge and agree to the following:
- Probabilistic Outputs: The AI Agent utilizes probabilistic machine learning models which may occasionally produce inaccurate or "hallucinated" outputs.
- No Warranty on Accuracy: We make no warranty regarding the absolute accuracy of the AI Agent's responses.
- User Verification: You are strictly responsible for verifying critical product information provided by the AI Agent before relying on it for business or medical decisions.
- Data Privacy & No Training: We utilize Google AI Studio as our paid AI service provider. Your inputs, prompts, and queries are strictly processed to provide your immediate response and are not used to train Google's foundation models.

4. USER-GENERATED CONTENT (UGC) AND ACCEPTABLE USE
To ensure a safe environment, you may not submit, upload, or share content that is offensive, discriminatory, threatening, or violates any third-party intellectual property rights.
- Objectionable Content: We reserve the right to filter, remove, or block any content that we determine to be objectionable or in violation of these Terms.
- Reporting & Blocking: You may report abusive behavior or objectionable content using the in-app reporting tools or by contacting support. We will act on reports within 24 hours and reserve the right to immediately suspend or terminate the accounts of abusive users.

5. INTELLECTUAL PROPERTY
Our Technology Platform Provider, Convey Pro Inc., retains all rights, title, and interest in and to the platform's technology, including the underlying source code and backend configurations. The Company retains ownership of the content and data it uploads to the platform.

6. APP STORE ADDITIONAL TERMS (APPLE iOS)
If you downloaded the App from the Apple App Store, the following terms apply:
- Acknowledgment: You acknowledge that these Terms are between you and the Company, not Apple. The Company (not Apple) is solely responsible for the App and its content.
- Maintenance and Support: Apple has no obligation whatsoever to furnish any maintenance and support services with respect to the App.
- Warranty: Apple is not responsible for any product warranties, whether express or implied by law.
- Third-Party Beneficiary: Apple and Apple's subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance, Apple will have the right to enforce these Terms against you.

7. LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER THE COMPANY NOR CONVEY PRO INC. SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE APP.

8. GOVERNING LAW
These Terms shall be governed by the laws of the State of ${companyState}, without regard to its conflict of law principles.

9. CONTACT INFORMATION
If you have any questions about these Terms, please contact us at:
${companyName}
${companyAddress}
${companyEmail}

For technical data requests related to the platform, please tap the link to send a question to our technology provider: https://www.cognitoforms.com/ConveyProInc/DataRequest
`;
