import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CookslateLogo from '../components/ui/CookslateLogo';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function PrivacyPolicyPage() {
  useDocumentTitle('Privacy Policy');

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
          <h1 className="text-3xl font-bold text-brown font-display">Privacy Policy</h1>
          <p className="text-warm-gray mt-1">Effective date: April 22, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-surface rounded-2xl shadow-md p-6 sm:p-8 space-y-6 text-brown text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold mb-2">1. Who We Are</h2>
            <p>
              Cookslate is operated by <strong>FMR Digital LLC</strong> ("we," "us," "our").
              This Privacy Policy applies to our hosted services at <strong>cookslate.app</strong>,
              including home.cookslate.app and demo.cookslate.app (the "Service").
            </p>
            <p className="mt-2">
              If you self-host Cookslate on your own infrastructure, this policy does not apply—you
              are the data controller for your own instance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">2. Information We Collect</h2>
            <h3 className="font-semibold mt-3 mb-1">Account Information</h3>
            <p>When you create an account, we collect your username, email address, and password (stored as a salted hash).</p>

            <h3 className="font-semibold mt-3 mb-1">User Content</h3>
            <p>
              Recipes, images, grocery lists, meal plans, cook history, collections, and any other
              content you create or import into the Service.
            </p>

            <h3 className="font-semibold mt-3 mb-1">Payment Information</h3>
            <p>
              If you purchase a Pro license, payment is processed by <strong>Stripe</strong>. We do not
              store your credit card number. Stripe provides us with a transaction ID, plan type, and
              billing email. See{' '}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-terracotta hover:underline">
                Stripe's Privacy Policy
              </a>.
            </p>

            <h3 className="font-semibold mt-3 mb-1">Automatically Collected Information</h3>
            <p>
              We collect minimal server logs (IP address, request timestamp, user agent) necessary for
              security and abuse prevention. <strong>We do not use analytics, tracking pixels, or
              third-party advertising services.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To provide, maintain, and improve the Service</li>
              <li>To process transactions and send related information (receipts, license keys)</li>
              <li>To authenticate your identity and prevent unauthorized access</li>
              <li>To detect and prevent abuse, fraud, and security incidents</li>
              <li>To respond to support requests</li>
            </ul>
            <p className="mt-2">We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">4. Data Storage & Security</h2>
            <p>
              Your data is stored on servers we operate. We use encryption in transit (TLS),
              salted password hashing, session-based authentication with HttpOnly cookies,
              CSRF protection, and account lockout policies to safeguard your information.
            </p>
            <p className="mt-2">
              No method of electronic storage is 100% secure. While we strive to protect your data,
              we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">5. Data Retention</h2>
            <p>
              We retain your account data and content for as long as your account is active. If you
              delete your account, we will delete your personal data from active systems within
              30 days. Residual copies in encrypted backups will be overwritten in the normal
              backup rotation cycle, not to exceed 90 days. Retention beyond these periods occurs
              only where required by law or for legitimate business purposes (e.g., fraud prevention).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">6. Your Rights</h2>
            <p>You may:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Access and export your data at any time through the Service</li>
              <li>Correct inaccurate information in your account settings</li>
              <li>Delete your account by contacting us</li>
              <li>Request a copy of the personal data we hold about you</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{' '}
              <a href="mailto:frank.robinson@cookslate.app" className="text-terracotta hover:underline">
                frank.robinson@cookslate.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">7. California Residents</h2>
            <p>
              Under the California Consumer Privacy Act (CCPA), California residents have the
              right to: (a) know what personal information we collect and how it is used;
              (b) request deletion of personal information; (c) opt out of the sale of personal
              information—we do not sell your personal information; (d) non-discrimination for
              exercising privacy rights. To exercise these rights, contact us at{' '}
              <a href="mailto:frank.robinson@cookslate.app" className="text-terracotta hover:underline">
                frank.robinson@cookslate.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">8. European Residents</h2>
            <p>
              If you are located in the European Economic Area (EEA), you may have additional
              rights under the General Data Protection Regulation (GDPR), including the right to
              data portability and the right to lodge a complaint with your local data protection
              authority. Our lawful basis for processing is contract performance (providing the
              Service) and legitimate interest (security and abuse prevention).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">9. Cookies</h2>
            <p>
              We use a single session cookie for authentication. We do not use tracking cookies,
              third-party cookies, or cookie-based advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">10. Children's Privacy</h2>
            <p>
              The Service is not directed to children under 13. We do not knowingly collect personal
              information from children under 13. If you believe a child has provided us with personal
              data, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">11. Self-Hosted Instances</h2>
            <p>
              Cookslate is available as open-source software that you can self-host. When you run
              Cookslate on your own infrastructure, FMR Digital LLC has no access to your data and
              this Privacy Policy does not apply. You are solely responsible for the data on your
              self-hosted instance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users
              of material changes via email or a notice within the Service. Continued use of the
              Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">13. Contact Us</h2>
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
