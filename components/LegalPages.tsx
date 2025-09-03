import React from 'react';
import { useAppContext } from '../contexts/AppContext';

interface LegalPagesProps {
  page: 'privacy' | 'terms' | 'cookies' | 'refund';
}

const LegalPages: React.FC<LegalPagesProps> = ({ page }) => {
  const { t } = useAppContext();

  const renderPrivacyPolicy = () => (
    <div className="max-w-4xl mx-auto p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <div className="space-y-4 text-gray-300">
            <p><strong>Personal Information:</strong> When you create an account, we collect your name, email address, and payment information.</p>
            <p><strong>Content Data:</strong> We store your video scripts, generated content, and project data to provide our services.</p>
            <p><strong>Usage Data:</strong> We collect information about how you use our platform, including features accessed and time spent.</p>
            <p><strong>Device Information:</strong> We may collect information about your device, browser, and IP address for security and analytics purposes.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <div className="space-y-4 text-gray-300">
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and improve our AI video creation services</li>
              <li>Process payments and manage your subscription</li>
              <li>Send you important updates about your account and our services</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Ensure platform security and prevent fraud</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
          <div className="space-y-4 text-gray-300">
            <p>We do not sell, trade, or rent your personal information to third parties. We may share information only in these circumstances:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist in our operations (under strict confidentiality agreements)</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <div className="space-y-4 text-gray-300">
            <p>We implement industry-standard security measures to protect your data, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>End-to-end encryption for sensitive data</li>
              <li>Regular security audits and updates</li>
              <li>Secure cloud infrastructure with AWS</li>
              <li>Access controls and authentication protocols</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
          <div className="space-y-4 text-gray-300">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access and download your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of marketing communications</li>
              <li>Data portability (export your content)</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
          <div className="space-y-4 text-gray-300">
            <p>If you have questions about this Privacy Policy, please contact us at:</p>
            <p>Email: privacy@viralyzaier.com</p>
            <p>Address: Viralyzaier Inc., 123 Tech Street, San Francisco, CA 94105</p>
          </div>
        </section>
      </div>
    </div>
  );

  const renderTermsOfService = () => (
    <div className="max-w-4xl mx-auto p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-gray-400 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <div className="space-y-4 text-gray-300">
            <p>By accessing and using Viralyzaier, you accept and agree to be bound by the terms and provision of this agreement.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <div className="space-y-4 text-gray-300">
            <p>Viralyzaier is an AI-powered video creation platform that provides:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>AI-generated video scripts and content</li>
              <li>Automated video editing and production tools</li>
              <li>Viral optimization and analytics</li>
              <li>Multi-platform publishing capabilities</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <div className="space-y-4 text-gray-300">
            <p>To use our service, you must:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Use only one account per person</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
          <div className="space-y-4 text-gray-300">
            <p>You agree not to use Viralyzaier for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Creating illegal, harmful, or offensive content</li>
              <li>Violating intellectual property rights</li>
              <li>Spamming or harassing other users</li>
              <li>Attempting to hack or disrupt our systems</li>
              <li>Creating content that violates platform policies (YouTube, TikTok, etc.)</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
          <div className="space-y-4 text-gray-300">
            <p><strong>Your Content:</strong> You retain ownership of content you create using our platform. You grant us a license to use your content to provide our services.</p>
            <p><strong>Our Platform:</strong> Viralyzaier and all its features, algorithms, and technology are protected by intellectual property laws.</p>
            <p><strong>AI-Generated Content:</strong> Content generated by our AI tools is provided for your use but may be subject to platform-specific policies.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Payment and Billing</h2>
          <div className="space-y-4 text-gray-300">
            <p>Our service operates on a credit-based system:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Credits are consumed for AI generation and processing</li>
              <li>Subscription plans provide monthly credit allocations</li>
              <li>Additional credits can be purchased as needed</li>
              <li>All payments are processed securely through Stripe</li>
              <li>Refunds are handled according to our refund policy</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
          <div className="space-y-4 text-gray-300">
            <p>We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service. We may temporarily suspend service for maintenance or updates.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
          <div className="space-y-4 text-gray-300">
            <p>Viralyzaier is provided "as is" without warranties. We are not liable for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Content performance or viral success</li>
              <li>Third-party platform policy changes</li>
              <li>Data loss or service interruptions</li>
              <li>Indirect or consequential damages</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
          <div className="space-y-4 text-gray-300">
            <p>Either party may terminate this agreement at any time. Upon termination, your access to the service will cease, but your content will remain accessible for 30 days for download.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
          <div className="space-y-4 text-gray-300">
            <p>For questions about these Terms of Service:</p>
            <p>Email: legal@viralyzaier.com</p>
            <p>Address: Viralyzaier Inc., 123 Tech Street, San Francisco, CA 94105</p>
          </div>
        </section>
      </div>
    </div>
  );

  const renderCookiePolicy = () => (
    <div className="max-w-4xl mx-auto p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">What Are Cookies?</h2>
          <div className="space-y-4 text-gray-300">
            <p>Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience and understand how you use our platform.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Types of Cookies We Use</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-xl font-semibold mb-2">Essential Cookies</h3>
              <p>These cookies are necessary for the website to function properly. They include authentication cookies and security features.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Analytics Cookies</h3>
              <p>We use Google Analytics to understand how users interact with our platform and improve our services.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Preference Cookies</h3>
              <p>These cookies remember your settings and preferences to provide a personalized experience.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Managing Cookies</h2>
          <div className="space-y-4 text-gray-300">
            <p>You can control cookies through your browser settings. However, disabling certain cookies may affect the functionality of our platform.</p>
          </div>
        </section>
      </div>
    </div>
  );

  const renderRefundPolicy = () => (
    <div className="max-w-4xl mx-auto p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Refund Policy</h1>
      <p className="text-gray-400 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Refund Eligibility</h2>
          <div className="space-y-4 text-gray-300">
            <p>We offer refunds under the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Technical issues preventing service use within 7 days of purchase</li>
              <li>Duplicate charges or billing errors</li>
              <li>Service not delivered as described</li>
              <li>Account cancellation within 24 hours of subscription start</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Non-Refundable Items</h2>
          <div className="space-y-4 text-gray-300">
            <p>The following are not eligible for refunds:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Used credits or AI generations</li>
              <li>Subscription renewals after 24 hours</li>
              <li>Content performance or viral success</li>
              <li>Third-party platform policy violations</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Refund Process</h2>
          <div className="space-y-4 text-gray-300">
            <p>To request a refund:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Contact our support team at support@viralyzaier.com</li>
              <li>Provide your account details and reason for refund</li>
              <li>We will review your request within 2-3 business days</li>
              <li>Approved refunds will be processed within 5-10 business days</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <div className="space-y-4 text-gray-300">
            <p>For refund inquiries:</p>
            <p>Email: support@viralyzaier.com</p>
            <p>Response time: Within 24 hours</p>
          </div>
        </section>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (page) {
      case 'privacy':
        return renderPrivacyPolicy();
      case 'terms':
        return renderTermsOfService();
      case 'cookies':
        return renderCookiePolicy();
      case 'refund':
        return renderRefundPolicy();
      default:
        return renderPrivacyPolicy();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {renderContent()}
    </div>
  );
};

export default LegalPages;
