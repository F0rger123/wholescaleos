import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { 
  Calendar, Clock, ArrowRight, User, Tag, Search,
  TrendingUp, Zap, BarChart3, Shield, Sparkles
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  featured?: boolean;
}

const categories = [
  'All',
  'Product Updates',
  'Industry Insights',
  'Automation',
  'Growth Strategies',
  'Case Studies'
];

const blogPosts: BlogPost[] = [
  {
    id: 'scaling-wholesale-operations',
    title: 'How to Scale Your Wholesale Operations 10x With AI Triage',
    excerpt: 'The average wholesaler loses 60% of inbound leads due to slow response times. Here\'s how AI-powered triage changes the game entirely.',
    author: 'The WholeScale Team',
    authorRole: 'Engineering',
    date: '2026-03-15',
    readTime: '8 min read',
    category: 'Automation',
    image: '',
    featured: true
  },
  {
    id: 'data-sovereignty-guide',
    title: 'The Complete Guide to Data Sovereignty in Real Estate',
    excerpt: 'Why owning your data isn\'t optional anymore—and how to make the switch from legacy CRMs without losing momentum.',
    author: 'The WholeScale Team',
    authorRole: 'Strategy',
    date: '2026-03-08',
    readTime: '12 min read',
    category: 'Industry Insights',
    image: '',
    featured: true
  },
  {
    id: 'lead-response-times',
    title: 'Why Sub-60-Second Lead Response Times Matter More Than Ever',
    excerpt: 'Data from 50,000+ leads shows a direct correlation between response speed and close rates. Here\'s what the numbers say.',
    author: 'The WholeScale Team',
    authorRole: 'Research',
    date: '2026-02-28',
    readTime: '6 min read',
    category: 'Growth Strategies',
    image: ''
  },
  {
    id: 'building-your-team-dashboard',
    title: 'Building a High-Performance Team Dashboard in 5 Minutes',
    excerpt: 'Step-by-step guide to setting up your team dashboard with real-time KPIs, leaderboard tracking, and automated alerts.',
    author: 'The WholeScale Team',
    authorRole: 'Product',
    date: '2026-02-20',
    readTime: '5 min read',
    category: 'Product Updates',
    image: ''
  },
  {
    id: 'wholesaler-case-study',
    title: 'From 30 to 300 Deals/Year: A Wholesaler\'s Journey With WholeScale OS',
    excerpt: 'How one team leader used automation and sovereign data to 10x their deal volume without adding headcount.',
    author: 'The WholeScale Team',
    authorRole: 'Community',
    date: '2026-02-12',
    readTime: '10 min read',
    category: 'Case Studies',
    image: ''
  },
  {
    id: 'sms-automation-best-practices',
    title: 'SMS Automation Best Practices for Real Estate Teams',
    excerpt: 'Compliance, personalization, and timing—everything you need to know about automated SMS outreach that converts.',
    author: 'The WholeScale Team',
    authorRole: 'Product',
    date: '2026-02-05',
    readTime: '7 min read',
    category: 'Automation',
    image: ''
  }
];

const categoryIcons: Record<string, any> = {
  'Product Updates': Sparkles,
  'Industry Insights': BarChart3,
  'Automation': Zap,
  'Growth Strategies': TrendingUp,
  'Case Studies': Shield,
};

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <motion.article 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <div className="astral-glass rounded-[2.5rem] border border-white/5 overflow-hidden hover:border-indigo-500/30 transition-all duration-500 hover-lift">
        <div className="aspect-[21/9] bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent relative flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1930] to-transparent" />
          <div className="relative z-10 text-center p-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <Sparkles size={12} className="animate-pulse" /> Featured
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] mb-4 group-hover:text-indigo-300 transition-colors">
              {post.title}
            </h2>
            <p className="text-[#a3aac4] text-lg max-w-2xl mx-auto leading-relaxed">
              {post.excerpt}
            </p>
          </div>
        </div>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs">
              WS
            </div>
            <div>
              <div className="text-sm font-bold text-white">{post.author}</div>
              <div className="text-[10px] text-[#6d758c] uppercase tracking-widest">{post.authorRole}</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[#6d758c] text-xs">
            <span className="flex items-center gap-2"><Calendar size={14} /> {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="flex items-center gap-2"><Clock size={14} /> {post.readTime}</span>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest transition-all hover:scale-105 group/btn">
            Read Article <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function BlogCard({ post, index }: { post: BlogPost; index: number }) {
  const CatIcon = categoryIcons[post.category] || TrendingUp;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group"
    >
      <div className="astral-glass rounded-[2rem] border border-white/5 overflow-hidden hover:border-indigo-500/20 transition-all duration-500 hover-lift h-full flex flex-col">
        <div className="aspect-[16/9] bg-gradient-to-br from-[#1e293b] to-[#0f1930] relative flex items-center justify-center overflow-hidden">
          <CatIcon size={48} className="text-white/5 group-hover:text-indigo-500/20 transition-colors duration-500" />
        </div>
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">
              {post.category}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight mb-3 leading-snug group-hover:text-indigo-300 transition-colors">
            {post.title}
          </h3>
          <p className="text-[#6d758c] text-sm leading-relaxed mb-6 flex-1">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-[9px]">
                WS
              </div>
              <div>
                <div className="text-xs font-bold text-[#a3aac4]">{post.author}</div>
                <div className="text-[9px] text-[#6d758c] uppercase tracking-widest">{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
            </div>
            <span className="text-[10px] text-[#6d758c] flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const heroReveal = useScrollReveal();

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPosts = filteredPosts.filter(p => p.featured);
  const regularPosts = filteredPosts.filter(p => !p.featured);

  return (
    <div className="bg-[#060e20] text-[#dee5ff] selection:bg-indigo-500/30 min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-16 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto" ref={heroReveal.elementRef}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Sparkles size={12} /> Intelligence Hub
            </div>
            <h1 className="text-5xl md:text-8xl font-black mb-6 leading-[0.9] tracking-tighter">
              The <span className="astral-gradient-text">Blog</span>
            </h1>
            <p className="text-xl text-[#a3aac4] max-w-2xl mx-auto leading-relaxed font-medium">
              Insights, strategies, and product updates from the WholeScale engineering and strategy teams.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="max-w-7xl mx-auto px-6 mb-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6d758c]" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[#6d758c] focus:border-indigo-500/50 focus:outline-none transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-white/5 text-[#6d758c] hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 mb-16 space-y-8">
          {featuredPosts.map((post) => (
            <FeaturedPost key={post.id} post={post} />
          ))}
        </section>
      )}

      {/* Blog Grid */}
      {regularPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regularPosts.map((post, i) => (
              <BlogCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {filteredPosts.length === 0 && (
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-[#6d758c]" />
            </div>
            <h3 className="text-xl font-black mb-2">No articles found</h3>
            <p className="text-[#6d758c]">Try adjusting your search or filter criteria.</p>
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-800 to-indigo-900 opacity-90" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto px-6 text-center relative z-10"
        >
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tighter italic leading-[0.9]">
            Stay Ahead of the Curve
          </h2>
          <p className="text-indigo-100 text-lg mb-10 max-w-xl mx-auto">
            Get weekly insights on automation, growth strategies, and product updates delivered to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full sm:flex-1 px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-200/50 focus:outline-none focus:border-white/40 transition-all text-sm"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-indigo-600 font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all hover:scale-105 shadow-xl"
            >
              Subscribe
            </button>
          </form>
        </motion.div>
      </section>
    </div>
  );
}