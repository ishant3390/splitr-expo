import React from "react";
import { ArrowLeft } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-semibold text-teal-700 mb-3">{title}</h2>
    <div className="text-slate-600 leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Simple header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors">
            <ArrowLeft size={16} />
            Back to Splitr
          </a>
          <img src="/splitr-wordmark.png" alt="Splitr" className="h-6 w-auto" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-400">Last updated: April 2026</p>
        </div>

        <p className="text-slate-600 leading-relaxed mb-10">
          At Splitr, we take your privacy seriously. This Privacy Policy explains what information
          we collect, how we use it, and your rights regarding your data. By using Splitr, you
          agree to the practices described below.
        </p>

        <Section title="1. Information We Collect">
          <p><strong className="text-slate-700">Account information:</strong> When you register, we collect your email address, phone number (if provided), and name. If you sign in via Google or Apple, we receive basic profile information from that provider.</p>
          <p><strong className="text-slate-700">Expense data:</strong> We store the expenses, groups, participants, amounts, currencies, and settlements you create within the app. This is the core data needed to provide the Service.</p>
          <p><strong className="text-slate-700">Profile photos:</strong> If you upload a profile photo or group image, we store that image on our secure cloud storage.</p>
          <p><strong className="text-slate-700">Device information:</strong> For push notifications on mobile, we collect a push notification token and device identifier. We do not collect device fingerprints or advertising IDs.</p>
          <p><strong className="text-slate-700">Usage data:</strong> We collect standard server logs (IP address, timestamps, request paths) for security and debugging purposes. Logs are retained for up to 90 days.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Provide, operate, and maintain the Splitr service</li>
            <li>Authenticate your identity and secure your account</li>
            <li>Send push notifications for expenses, settlements, and reminders (where enabled)</li>
            <li>Send transactional emails (OTP codes, invite notifications, account updates)</li>
            <li>Diagnose and fix bugs and performance issues</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>
            We do not use your expense data for advertising, profiling, or any purpose other than
            operating the Service.
          </p>
        </Section>

        <Section title="3. Third-Party Services">
          <p>We use the following third-party services to operate Splitr:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong className="text-slate-700">Clerk</strong> — Authentication and user management.
              Clerk handles sign-in flows, OAuth connections (Google, Apple), and session tokens.
              See <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Clerk's Privacy Policy</a>.
            </li>
            <li>
              <strong className="text-slate-700">Cloudflare</strong> — CDN, DNS, and image storage
              (Cloudflare R2). Profile and group images are stored in Cloudflare R2.
              See <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Cloudflare's Privacy Policy</a>.
            </li>
            <li>
              <strong className="text-slate-700">Railway</strong> — Backend infrastructure hosting.
              Your data is stored on Railway-managed PostgreSQL databases.
              See <a href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Railway's Privacy Policy</a>.
            </li>
            <li>
              <strong className="text-slate-700">Resend</strong> — Transactional email delivery
              (OTP codes, invite emails, notifications).
              See <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Resend's Privacy Policy</a>.
            </li>
            <li>
              <strong className="text-slate-700">Expo / Apple / Google</strong> — Push notification
              delivery on mobile devices.
            </li>
          </ul>
          <p>
            These services may process personal data on our behalf, strictly to provide the
            functionality described above. We do not sell your data to third parties.
          </p>
        </Section>

        <Section title="4. Data Sharing">
          <p>
            We do not sell, trade, or rent your personal information to third parties.
          </p>
          <p>
            Within the app, expense data is shared with other members of your groups — this is
            fundamental to how expense splitting works. You control who you invite to your groups.
          </p>
          <p>
            We may disclose information if required by law, court order, or to protect the rights,
            property, or safety of Splitr, our users, or the public.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your account and expense data for as long as your account is active. If you
            delete your account, we will delete your personal data within 30 days, except where we
            are required to retain it for legal or regulatory purposes.
          </p>
          <p>
            Note: deleting your account does not delete your contribution to shared group expenses.
            Amounts and participant records may be retained in anonymised form to preserve the
            integrity of other members' records.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Object to or restrict certain processing activities</li>
            <li>Receive a copy of your data in a portable format</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:hello@splitr.ai" className="text-teal-600 hover:underline">hello@splitr.ai</a>.
            We will respond within 30 days.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We implement industry-standard security measures including HTTPS encryption for all
            data in transit, secure credential storage via Clerk, and access-controlled database
            infrastructure. However, no method of transmission over the internet or electronic
            storage is 100% secure.
          </p>
          <p>
            If you discover a security vulnerability, please report it responsibly to{" "}
            <a href="mailto:hello@splitr.ai" className="text-teal-600 hover:underline">hello@splitr.ai</a>.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            The Service is not directed to children under the age of 13. We do not knowingly
            collect personal information from children under 13. If we become aware that a child
            under 13 has provided us with personal information, we will delete it promptly.
          </p>
        </Section>

        <Section title="9. Cookies and Local Storage">
          <p>
            We use browser local storage and session storage to maintain your logged-in session and
            store app preferences (such as your preferred currency and notification settings). We do
            not use tracking cookies or third-party advertising cookies.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by updating the "Last updated" date above and, where appropriate, by sending
            you an email notification. Your continued use of the Service after changes are posted
            constitutes your acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy, please
            contact us at{" "}
            <a href="mailto:hello@splitr.ai" className="text-teal-600 hover:underline font-medium">
              hello@splitr.ai
            </a>.
          </p>
        </Section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} Splitr. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</a>
            <a href="mailto:hello@splitr.ai" className="hover:text-teal-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
