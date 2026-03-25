import { 
  Bot, Users, 
  Layers 
} from 'lucide-react';

export default function Features() {
  const sections = [
    {
      title: 'AI-Powered Automation',
      subtitle: 'The Hub of Your Operations',
      icon: Bot,
      features: [
        { name: 'SMS Analysis', desc: 'AI automatically summarizes conversations and detects buyer intent.' },
        { name: 'Suggested Replies', desc: 'Context-aware reply options generated for every message.' },
        { name: 'Info Extraction', desc: 'Automatically extract names, addresses, and phone numbers from texts.' },
        { name: 'Auto-Pilot', desc: 'Set up rules for automated follow-ups and lead tagging.' },
      ]
    },
    {
      title: 'Operations Center',
      subtitle: 'Control Every Detail',
      icon: Layers,
      features: [
        { name: 'Interactive Maps', desc: 'Visualize your entire portfolio with high-precision map markers.' },
        { name: 'Deal Calculators', desc: 'Analyze ROI, rental yields, and flip potential in seconds.' },
        { name: 'Task Management', desc: 'Robust Kanban-style task tracking integrated with leads.' },
        { name: 'Import Engine', desc: 'Import leads from CSV, PDFs, or even property listing URLs.' },
      ]
    },
    {
      title: 'Team Workspace',
      subtitle: 'High Velocity Collaboration',
      icon: Users,
      features: [
        { name: 'Real-time Chat', desc: 'Built-in team communication channels for every department.' },
        { name: 'Presence Tracking', desc: 'See who is online and active in real-time.' },
        { name: 'Shared Calendars', desc: 'Synced team schedules for easy appointment management.' },
        { name: 'Role-based Access', desc: 'Fine-grained permissions for admins, members, and viewers.' },
      ]
    }
  ];

  return (
    <div className="pb-32">
      <section className="pt-20 pb-20 text-center px-6">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Built for <span className="text-blue-500">Excellence</span></h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Every tool you need to scale your real estate business, engineered for speed and precision.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 space-y-32">
        {sections.map((section, idx) => (
          <div key={idx} className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-16 items-center`}>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-sm mb-4">
                <section.icon size={20} /> {section.subtitle}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-8">{section.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {section.features.map((feature, fIdx) => (
                  <div key={fIdx}>
                    <h3 className="font-bold text-lg mb-2 text-white">{feature.name}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full max-w-md aspect-square rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-white/5 flex items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
               <section.icon size={120} className="text-blue-500/40 relative z-10 group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
