
export default function Privacy() {
  return (
    <div className="bg-[#0f172a] min-h-screen text-white pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-black mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-gray-400">
          <p className="text-xl text-gray-300">Last Updated: March 25, 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">1. Introduction</h2>
            <p>
              At WholeScale OS, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you visit our website and use our platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">2. Information Collection</h2>
            <p>
              We collect information that you provide directly to us, such as when you create an account, 
              subscribe to our newsletter, or contact support. This may include your name, email address, 
              phone number, and payment information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, maintain, and improve our services.</li>
              <li>To process transactions and send related information.</li>
              <li>To communicate with you about products, services, and events.</li>
              <li>To monitor and analyze trends, usage, and activities.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">4. Data Security</h2>
            <p>
              We implement reasonable security measures to protect your information from unauthorized access, 
              disclosure, alteration, or destruction. However, no method of transmission over the Internet 
              is 100% secure.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">5. Your Choices</h2>
            <p>
              You can access, update, or delete your account information at any time by logging into your 
              account settings. You may also opt out of receiving promotional communications from us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at support@wholescaleos.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
