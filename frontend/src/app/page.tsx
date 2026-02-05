'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, TrendingUp, Shield, Clock, Users, DollarSignIcon, Star, Play, Menu, X, ArrowRight, CheckCircle2, MapPin, Phone, Mail, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    { icon: Clock, title: "Fast Approval", desc: "Get your loan approved within 24 hours", color: "from-blue-500 to-blue-600" },
    { icon: Shield, title: "Secure Process", desc: "Bank-level security for your data", color: "from-green-500 to-green-600" },
    { icon: TrendingUp, title: "Flexible Terms", desc: "Customize repayment to fit your income", color: "from-purple-500 to-purple-600" },
    { icon: Users, title: "24/7 Support", desc: "Our team is always here to help", color: "from-orange-500 to-orange-600" }
  ];

  const stats = [
    { value: "10K+", label: "Loans Approved" },
    { value: "98%", label: "Customer Satisfaction" },
    { value: "24h", label: "Average Approval" },
    { value: "5M+", label: "Disbursed ($)" }
  ];

  const testimonials = [
    { name: "John Kamau", role: "Boda Boda Rider", image: "JK", text: "Bingo Vintage helped me get my first motorcycle. Now I earn 3x more!", rating: 5 },
    { name: "Sarah Otieno", role: "Delivery Partner", image: "SO", text: "The flexible repayment saved my business during slow months!", rating: 5 },
    { name: "Mike Mwangi", role: "Tuk-Tuk Operator", image: "MM", text: "From application to getting my tuk-tuk took just 2 days!", rating: 5 }
  ];

  const loanTypes = [
    { title: "Motorcycle Loan", icon: Bike, price: "From ugx70000/month", features: ["Boxer & Bajaj models", "Comprehensive insurance", "Maintenance included", "3-12 month terms"], popular: true },
    { title: "Tuk-Tuk Loan", icon: MapPin, price: "From ugx150k/month", features: ["New & used tuk-tuks", "Commercial permit help", "Spare parts warranty", "6-18 month terms"], popular: false },
    { title: "Cash Loan", icon: DollarSign, price: "From ugx50k", features: ["No collateral needed", "Same day disbursement", "Flexible repayment", "1-6 month terms"], popular: false }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bike className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Bingo Vintage</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#loans" className="text-gray-600 hover:text-blue-600 transition-colors">Loan Types</a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">Testimonials</a>
              <button onClick={() => router.push('/auth/login')} className="text-blue-600 font-medium hover:text-blue-700">Sign In</button>
              <button onClick={() => router.push('/auth/login')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">Get Started</button>
            </div>

            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white border-t border-gray-100">
              <div className="px-4 py-4 space-y-3">
                <a href="#features" className="block py-2 text-gray-600">Features</a>
                <a href="#loans" className="block py-2 text-gray-600">Loan Types</a>
                <button onClick={() => router.push('/auth/login')} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium">Get Started</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50"></div>
        <div className="absolute inset-0 overflow-hidden">
          <motion.div animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-20 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30" />
          <motion.div animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-40 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
                <Star className="h-4 w-4 fill-current" />
                Trusted by 10,000+ riders
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">Get Your <span className="text-blue-600">Dream Ride</span> Today</h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">Fast, affordable motorcycle and tuk-tuk loans for riders. No collateral needed, flexible repayment, and approval in 24 hours.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/auth/login')} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">Apply Now <ArrowRight className="h-5 w-5" /></motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-white text-gray-700 border-2 border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg hover:border-blue-600 hover:text-blue-600 transition-all flex items-center justify-center gap-2"><Play className="h-5 w-5" /> Watch Video</motion.button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
              <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 shadow-2xl">
                <svg viewBox="0 0 400 300" className="w-full h-auto">
                  <circle cx="350" cy="50" r="30" fill="#FBBF24"><animate attributeName="r" values="30;35;30" dur="3s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" /></circle>
                  <line x1="0" y1="250" x2="400" y2="250" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeDasharray="10,10" />
                  <g transform="translate(100, 150)">
                    <circle cx="0" cy="80" r="35" fill="#1F2937" stroke="#000" strokeWidth="3" />
                    <circle cx="180" cy="80" r="35" fill="#1F2937" stroke="#000" strokeWidth="3" />
                    <path d="M0 80 L40 40 L100 20 L140 40 L180 80" fill="none" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" />
                    <path d="M80 20 Q110 10 130 30 L80 30 Z" fill="#EF4444" />
                    <rect x="70" y="35" width="40" height="25" rx="5" fill="#9CA3AF" />
                    <circle cx="185" cy="50" r="8" fill="#FBBF24" />
                    <path d="M193 46 L220 40 M193 50 L225 50 M193 54 L220 60" stroke="#FBBF24" strokeWidth="2" />
                    <circle cx="90" cy="5" r="12" fill="#3B82F6" />
                    <rect x="80" y="15" width="20" height="25" fill="#059669" rx="3" />
                  </g>
                  <circle cx="320" cy="200" r="15" fill="#FBBF24" stroke="#D97706" strokeWidth="2"><animate attributeName="cy" values="200;180;200" dur="2s" repeatCount="indefinite" /></circle>
                  <text x="320" y="205" textAnchor="middle" fill="#92400E" fontSize="12" fontWeight="bold"><animate attributeName="y" values="205;185;205" dur="2s" repeatCount="indefinite" />$</text>
                </svg>
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -left-8 top-20 bg-white rounded-xl p-4 shadow-lg"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle2 className="h-6 w-6 text-green-600" /></div><div><p className="text-sm font-semibold text-gray-900">Approved!</p><p className="text-xs text-gray-500">Just now</p></div></div></motion.div>
                <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -right-4 bottom-20 bg-white rounded-xl p-4 shadow-lg"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><DollarSign className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm font-semibold text-gray-900">$2,500</p><p className="text-xs text-gray-500">Disbursed</p></div></div></motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Why Choose Bingo Vintage?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">We make vehicle financing simple, fast, and accessible to everyone.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} whileHover={{ y: -5 }} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}><feature.icon className="h-7 w-7 text-white" /></div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Loan Types Section */}
      <section id="loans" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Choose Your Loan Type</h2>
            <p className="text-xl text-gray-600">Flexible options designed for your needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {loanTypes.map((loan, index) => (
              <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} className={`relative bg-white rounded-2xl p-8 shadow-lg ${loan.popular ? 'ring-2 ring-blue-600' : ''}`}>
                {loan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</div>}
                <div className={`w-16 h-16 rounded-2xl ${loan.popular ? 'bg-blue-600' : 'bg-gray-100'} flex items-center justify-center mb-6`}><loan.icon className={`h-8 w-8 ${loan.popular ? 'text-white' : 'text-gray-600'}`} /></div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{loan.title}</h3>
                <div className="text-3xl font-bold text-blue-600 mb-6">{loan.price}</div>
                <ul className="space-y-3 mb-8">
                  {loan.features.map((feature, i) => <li key={i} className="flex items-center gap-3 text-gray-600"><CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />{feature}</li>)}
                </ul>
                <button onClick={() => router.push('/auth/login')} className={`w-full py-3 rounded-xl font-semibold transition-all ${loan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>Apply Now</button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">What Our Customers Say</h2>
            <p className="text-xl text-blue-100">Real stories from real riders</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={currentTestimonial} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.5 }} className="bg-white rounded-3xl p-8 lg:p-12 shadow-2xl">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{testimonials[currentTestimonial].image}</div>
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex justify-center lg:justify-start gap-1 mb-4">
                      {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />)}
                    </div>
                    <p className="text-xl text-gray-700 mb-6 italic">"{testimonials[currentTestimonial].text}"</p>
                    <div>
                      <div className="font-bold text-gray-900">{testimonials[currentTestimonial].name}</div>
                      <div className="text-gray-500">{testimonials[currentTestimonial].role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => <button key={index} onClick={() => setCurrentTestimonial(index)} className={`w-3 h-3 rounded-full transition-all ${index === currentTestimonial ? 'bg-white w-8' : 'bg-blue-400'}`} />)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-8 lg:p-16 text-center text-white shadow-2xl">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">Join thousands of riders who have transformed their lives with our affordable loans.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/auth/login')} className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-lg">Apply for Loan</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all">Contact Sales</motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center"><Bike className="h-6 w-6 text-white" /></div>
                <span className="text-xl font-bold">Bingo Vintage</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-sm">Empowering riders with affordable motorcycle and tuk-tuk loans. Your journey to financial freedom starts here.</p>
              <div className="flex gap-4">
                {['F', 'T', 'I', 'L'].map((letter, i) => <a key={i} href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors font-bold">{letter}</a>)}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#loans" className="hover:text-white transition-colors">Loan Types</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Contact Us</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-2"><MapPin className="h-5 w-5" />Mbale, Uganda</li>
                <li className="flex items-center gap-2"><Phone className="h-5 w-5" />+256 781909507</li>
                <li className="flex items-center gap-2"><Mail className="h-5 w-5" />info@bingovintage.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© 2026 Bingo Vintage. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}