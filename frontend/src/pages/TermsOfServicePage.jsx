import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CookslateLogo from '../components/ui/CookslateLogo';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function TermsOfServicePage() {
  useDocumentTitle('Terms of Service');

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-terracotta hover:underline mb-4">
            <ArrowLeft size={14} />
            Back
          </Link>
          <div className="inline-flex items-center justify-center mb-4 block">
            <CookslateLogo size={48} className="text-terracotta" />
          </div>
          <h1 className="text-3xl font-bold text-brown font-display">Terms of Service</h1>
          <p className="text-warm-gray mt-1">Effective date: April 22, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-surface rounded-2xl shadow-md p-6 sm:p-8 space-y-6 text-brown text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Cookslate at <strong>cookslate.app</strong> (the "Service"),
              operated by <strong>FMR Digital LLC</strong> ("we," "us," "our"), you agree to be
              bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">2. Description of Service</h2>
            <p>
              Cookslate is a recipe management application available as a hosted service and as
              self-hosted open-source software. These Terms govern only your use of the hosted
              Service at cookslate.app (including home.cookslate.app and demo.cookslate.app).
            </p>
            <p className="mt-2">
              Self-hosted instances are governed by the applicable open-source license (AGPL-3.0 for
              community features) and the Business Source License (BSL 1.1) for Pro features. These
              Terms do not apply to self-hosted instances.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">3. Accounts</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must notify us promptly of any unauthorized access to your account.</li>
              <li>You must be at least 13 years old to use the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">4. Free & Pro Tiers</h2>
            <p>
              The Service is available in a free tier with core features and a paid Pro tier with
              additional capabilities. We reserve the right to modify which features are included
              in each tier with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">5. Payment Terms</h2>
            <h3 className="font-semibold mt-3 mb-1">Billing</h3>
            <p>
              Pro licenses are one-time purchases. All payments are processed through{' '}
              <strong>Stripe</strong>. By providing payment information, you authorize us to
              charge the applicable fee.
            </p>

            <h3 className="font-semibold mt-3 mb-1">Pricing Changes</h3>
            <p>
              We may change pricing for new purchases at any time. Price changes do not affect
              previously purchased licenses.
            </p>

            <h3 className="font-semibold mt-3 mb-1">Refunds</h3>
            <p>
              If you are unsatisfied with a Pro purchase, contact us within 14 days for a full
              refund. After 14 days, refunds are at our discretion.
            </p>

            <h3 className="font-semibold mt-3 mb-1">License Delivery</h3>
            <p>
              Upon payment, you will receive a license key delivered to your account. The license
              key is for your use only and may not be shared, redistributed, or resold.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">6. User Content</h2>
            <p>
              You retain ownership of all content you create or upload to the Service (recipes,
              images, grocery lists, etc.). By using the Service, you grant us a limited license
              to store, process, and display your content solely to provide the Service to you.
            </p>
            <p className="mt-2">You agree not to upload content that:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Infringes on the intellectual property rights of others</li>
              <li>Is unlawful, harmful, threatening, abusive, or otherwise objectionable</li>
              <li>Contains malware or any form of malicious code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">7. Demo Account</h2>
            <p>
              The demo account (demo.cookslate.app) is provided for evaluation purposes. Demo
              accounts are read-only and may be reset at any time. No data persistence is
              guaranteed for demo accounts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">8. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its infrastructure</li>
              <li>Interfere with or disrupt the Service or its servers</li>
              <li>Scrape, crawl, or use automated means to access the Service without permission</li>
              <li>Use the Service to store or transmit content unrelated to recipe management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">9. Availability & Support</h2>
            <p>
              We strive to keep the Service available but do not guarantee uninterrupted access.
              The Service may be temporarily unavailable for maintenance, updates, or circumstances
              beyond our control. We provide support on a best-effort basis via email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">10. Data & Backups</h2>
            <p>
              While we perform regular backups, you are responsible for maintaining your own copies
              of important data. We recommend using the export feature periodically. We are not
              liable for data loss.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">11. Termination</h2>
            <p>
              You may stop using the Service and delete your account at any time. We may suspend
              or terminate your account if you violate these Terms, with notice when practicable.
              Upon termination, your right to use the Service ceases. We may retain anonymized or
              aggregated data that does not identify you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">12. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT
              THE SERVICE WILL BE ERROR-FREE OR UNINTERRUPTED.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">13. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, FMR DIGITAL LLC SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
              LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR
              USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US
              IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">14. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless FMR Digital LLC from any claims, damages,
              or expenses arising from your use of the Service, your content, or your violation
              of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">15. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, without regard to its conflict of law provisions.
            </p>
            <p className="mt-2">
              Any disputes arising under these Terms shall first be resolved through good-faith
              negotiation for a period of 30 days. If unresolved, disputes shall be submitted to
              binding arbitration under the rules of the American Arbitration Association in the
              State of Delaware, except that either party may seek injunctive relief in a court
              of competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">16. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify registered users of
              material changes via email or a notice within the Service at least 30 days before
              changes take effect. Continued use of the Service after changes constitutes
              acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">17. Contact Us</h2>
            <p>
              FMR Digital LLC<br />
              Email:{' '}
              <a href="mailto:frank.robinson@cookslate.app" className="text-terracotta hover:underline">
                frank.robinson@cookslate.app
              </a>
            </p>
          </section>
        </div>

        <p className="text-center text-xs text-warm-gray/60 mt-6">
          &copy; 2026 FMR Digital LLC &middot; All rights reserved.
        </p>
      </div>
    </div>
  );
}
