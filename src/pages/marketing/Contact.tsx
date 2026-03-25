import { Mail, MessageSquare, MapPin, Globe } from 'lucide-react';

export default function Contact() {
  return (
    <div className="bg-[#0f172a] min-h-screen text-white pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black mb-4">Get in Touch</h1>
          <p className="text-xl text-gray-400">We're here to help you scale your real estate empire.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
              <h2 className="text-2xl font-bold">Contact Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Email Us</div>
                    <div className="text-sm">support@wholescaleos.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-500">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Text Support</div>
                    <div className="text-sm">+1 (555) 123-4567</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-500">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Offices</div>
                    <div className="text-sm">Remote-First | Global Presence</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="w-10 h-10 rounded-xl bg-green-600/10 flex items-center justify-center text-green-500">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Community</div>
                    <div className="text-sm">Join our elite Discord</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-blue-600 space-y-4 shadow-2xl shadow-blue-600/20">
              <h3 className="text-xl font-bold">Ready to Start?</h3>
              <p className="text-blue-100 italic">
                "Small teams, elite performance. WholeScale OS is the foundation of our success."
              </p>
              <div className="text-sm font-black uppercase tracking-widest opacity-80 pt-4">WholeScale OS Team</div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-white/10 shadow-2xl">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">Full Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe"
                  className="w-full px-5 py-4 rounded-xl bg-[#0f172a] border border-white/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">Email Address</label>
                <input 
                  type="email" 
                  placeholder="john@example.com"
                  className="w-full px-5 py-4 rounded-xl bg-[#0f172a] border border-white/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">Message</label>
                <textarea 
                  rows={4}
                  placeholder="How can we help you?"
                  className="w-full px-5 py-4 rounded-xl bg-[#0f172a] border border-white/10 focus:border-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-lg font-black transition-all hover:scale-[1.02] shadow-xl shadow-blue-600/20"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
