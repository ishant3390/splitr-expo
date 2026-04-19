import React from "react";
import { ArrowLeft } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-semibold text-teal-700 mb-3">{title}</h2>
    <div className="text-slate-600 leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-400">Last updated: April 2026</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using Splitr ("the Service"), you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use the Service.
          </p>
          <p>
            These terms apply to all visitors, users, and others who access or use the Service.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            Splitr is a personal expense-splitting application that helps you track shared expenses
            with friends, family, and groups. The Service allows you to record expenses, calculate
            balances, and coordinate settlements between participants.
          </p>
          <p>
            Splitr is an informational tool only. We do not process payments, hold funds, or act as
            a financial institution. Any actual money transfers occur directly between users through
            third-party payment services.
          </p>
        </Section>

        <Section title="3. Account Registration">
          <p>
            To use Splitr, you must create an account using a valid email address, phone number, or
            a supported OAuth provider (Google, Apple). You are responsible for maintaining the
            confidentiality of your account credentials.
          </p>
          <p>
            You must be at least 13 years of age to use the Service. By creating an account, you
            represent that you meet this requirement.
          </p>
          <p>
            You are responsible for all activity that occurs under your account. Please notify us
            immediately at <a href="mailto:hello@splitr.ai" className="text-teal-600 hover:underline">hello@splitr.ai</a> if
            you suspect any unauthorised use.
          </p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Record fraudulent, fictitious, or illegal transactions</li>
            <li>Harass, threaten, or harm other users</li>
            <li>Attempt to gain unauthorised access to the Service or other users' accounts</li>
            <li>Reverse-engineer, scrape, or copy any part of the Service</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms without
            prior notice.
          </p>
        </Section>

        <Section title="5. Financial Disclaimer">
          <p>
            Splitr records expense data as entered by users. We do not verify the accuracy of
            amounts, participants, or payment confirmations. All financial data in Splitr is
            self-reported and for personal record-keeping purposes only.
          </p>
          <p>
            Splitr is not a bank, payment processor, money transmitter, or financial advisor.
            Nothing in the Service constitutes financial, legal, or tax advice.
          </p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            The Service and its original content, features, and functionality are and will remain
            the exclusive property of Splitr and its licensors. Our trademarks and trade dress may
            not be used in connection with any product or service without our prior written consent.
          </p>
          <p>
            You retain ownership of any expense data you enter into the Service. By using the
            Service, you grant us a limited licence to store and process that data solely to provide
            the Service to you.
          </p>
        </Section>

        <Section title="7. Termination">
          <p>
            You may delete your account at any time by contacting us at{" "}
            <a href="mailto:hello@splitr.ai" className="text-teal-600 hover:underline">hello@splitr.ai</a>.
            Upon deletion, your personal data will be removed in accordance with our{" "}
            <a href="/privacy" className="text-teal-600 hover:underline">Privacy Policy</a>.
          </p>
          <p>
            We may terminate or suspend your account immediately, without prior notice, if you
            breach these Terms or if we are required to do so by law.
          </p>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>
            The Service is provided on an "as is" and "as available" basis without any warranties
            of any kind, either express or implied, including but not limited to implied warranties
            of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p>
            We do not warrant that the Service will be uninterrupted, error-free, or free of
            viruses or other harmful components.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, Splitr shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including loss of
            profits, data, or goodwill, arising out of or in connection with your use of or
            inability to use the Service.
          </p>
          <p>
            Our total liability to you for any claims arising out of or relating to these Terms or
            the Service shall not exceed the amount you paid us in the twelve months preceding the
            claim (or $10 if you have not made any payments).
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify you of material changes by
            updating the "Last updated" date above and, where appropriate, via email. Your
            continued use of the Service after any changes constitutes acceptance of the new Terms.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with applicable law. Any
            disputes arising under these Terms shall be subject to the exclusive jurisdiction of
            the competent courts.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            If you have any questions about these Terms, please contact us at{" "}
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
            <a href="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</a>
            <a href="mailto:hello@splitr.ai" className="hover:text-teal-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
