'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Bike, Loader2, Eye, EyeOff, Shield, DollarSign, TrendingUp, Users, Clock, CheckCircle, Car } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(credentials);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Asset Finance Scene - CLEAN TABLE LAYOUT */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-600 items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 -right-20 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl"></div>
        </div>
        
        {/* Illustration Content */}
        <div className="relative z-10 w-full max-w-5xl px-8">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-8 py-3 rounded-full mb-4">
              <Bike className="h-7 w-7 text-white" />
              <h2 className="text-2xl font-bold text-white">BINGO VINTAGE FINANCE</h2>
              <Car className="h-7 w-7 text-white" />
            </div>
            <p className="text-blue-100 text-lg">Asset Financing & Loan Management</p>
          </div>

          {/* Clean Table Layout - No Overlapping */}
          <div className="mb-6 bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            {/* Three Column Layout */}
            <div className="grid grid-cols-3 gap-8 items-center justify-center">
              
              {/* COLUMN 1: TUK TUK */}
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Car className="h-8 w-8 text-yellow-300" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">TUK TUK LOANS</h3>
                  <p className="text-blue-100 text-sm">Auto Rickshaw Financing</p>
                </div>
                <div className="w-full h-48">
                  <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Blue Background */}
                    <rect width="200" height="200" fill="#1D4ED8" fillOpacity="0.2" rx="12"/>
                    
                    {/* Tuk Tuk */}
                    <g transform="translate(50, 80)">
                      {/* Body */}
                      <path d="M10 60 L110 60 L110 30 Q110 10 80 5 L40 5 Q10 10 10 40 Z" fill="#1F2937"/>
                      <path d="M10 40 L110 40 L110 30 Q110 10 80 10 L40 10 Q10 15 10 40 Z" fill="#FBBF24"/>
                      
                      {/* Windshield */}
                      <path d="M70 15 L100 15 L105 35 L70 35 Z" fill="#E2E8F0" opacity="0.6"/>
                      
                      {/* Wheels */}
                      <circle cx="35" cy="65" r="15" fill="#374151" stroke="#1F2937" strokeWidth="2"/>
                      <circle cx="35" cy="65" r="8" fill="#6B7280"/>
                      <circle cx="85" cy="65" r="15" fill="#374151" stroke="#1F2937" strokeWidth="2"/>
                      <circle cx="85" cy="65" r="8" fill="#6B7280"/>
                      
                      {/* Headlight */}
                      <circle cx="108" cy="40" r="6" fill="#FBBF24"/>
                    </g>
                    
                    {/* Road Line */}
                    <path d="M20 140 L180 140" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 5"/>
                  </svg>
                </div>
                <div className="mt-4 flex justify-center space-x-2">
                  <div className="w-8 h-2 bg-yellow-400 rounded-full"></div>
                  <div className="w-8 h-2 bg-yellow-400 rounded-full opacity-50"></div>
                  <div className="w-8 h-2 bg-yellow-400 rounded-full opacity-30"></div>
                </div>
              </div>
              
              {/* COLUMN 2: FINANCE SYMBOLS (Center) */}
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-8 w-8 text-emerald-300" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">QUICK FINANCING</h3>
                  <p className="text-blue-100 text-sm">Instant Loan Approval</p>
                </div>
                <div className="w-full h-48 relative">
                  <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Blue Background */}
                    <rect width="200" height="200" fill="#1D4ED8" fillOpacity="0.2" rx="12"/>
                    
                    {/* Money Stack */}
                    <g transform="translate(60, 40)">
                      <rect x="0" y="0" width="80" height="50" rx="8" fill="#10B981"/>
                      <rect x="10" y="-10" width="60" height="50" rx="8" fill="#10B981" fillOpacity="0.8"/>
                      <rect x="20" y="-20" width="40" height="50" rx="8" fill="#10B981" fillOpacity="0.6"/>
                      <text x="40" y="35" textAnchor="middle" fill="white" fontFamily="Arial" fontWeight="bold" fontSize="24">$$</text>
                    </g>
                    
                    {/* Growth Arrow */}
                    <g transform="translate(100, 120)">
                      <path d="M0 0 L20 -20 L40 0" stroke="#3B82F6" strokeWidth="4" fill="none"/>
                      <path d="M20 -20 L20 -40" stroke="#3B82F6" strokeWidth="4"/>
                      <path d="M20 -40 L15 -35 L25 -35" fill="#3B82F6"/>
                    </g>
                    
                    {/* Coins */}
                    <g transform="translate(40, 130)">
                      <circle cx="0" cy="0" r="15" fill="#F59E0B"/>
                      <circle cx="25" cy="-5" r="12" fill="#F59E0B" fillOpacity="0.8"/>
                      <circle cx="45" cy="5" r="10" fill="#F59E0B" fillOpacity="0.6"/>
                      <text x="0" y="5" textAnchor="middle" fill="white" fontFamily="Arial" fontWeight="bold" fontSize="12">$</text>
                      <text x="25" y="0" textAnchor="middle" fill="white" fontFamily="Arial" fontWeight="bold" fontSize="10">$</text>
                    </g>
                    
                    {/* Shield */}
                    <g transform="translate(130, 60)">
                      <path d="M0 20 L15 0 L30 20 L30 35 L15 45 L0 35 Z" fill="white" fillOpacity="0.9"/>
                      <path d="M15 5 L20 12 L15 18 L10 12 Z" fill="#3B82F6"/>
                      <circle cx="15" cy="28" r="5" fill="#3B82F6"/>
                    </g>
                  </svg>
                </div>
                <div className="mt-4 flex justify-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div className="w-6 h-6 rounded-full bg-blue-400 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-6 h-6 rounded-full bg-yellow-400 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
              
              {/* COLUMN 3: MOTORCYCLE */}
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bike className="h-8 w-8 text-blue-300" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">BODA LOANS</h3>
                  <p className="text-blue-100 text-sm">Motorcycle Financing</p>
                </div>
                <div className="w-full h-48">
                  <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Blue Background */}
                    <rect width="200" height="200" fill="#1D4ED8" fillOpacity="0.2" rx="12"/>
                    
                    {/* Motorcycle with Rider */}
                    <g transform="translate(40, 70)">
                      {/* Frame */}
                      <path d="M0 40 L30 25 L60 15 L90 25 L120 40" stroke="#1F2937" strokeWidth="4" fill="none"/>
                      
                      {/* Wheels */}
                      <circle cx="0" cy="40" r="20" fill="#374151"/>
                      <circle cx="120" cy="40" r="20" fill="#374151"/>
                      
                      {/* Tank */}
                      <path d="M45 10 Q75 10 90 25 L45 25 Z" fill="#EF4444"/>
                      
                      {/* Engine */}
                      <rect x="35" y="20" width="50" height="15" rx="4" fill="#6B7280"/>
                      
                      {/* Rider */}
                      <g transform="translate(50, -5)">
                        {/* Helmet */}
                        <ellipse cx="0" cy="0" rx="10" ry="12" fill="#3B82F6"/>
                        
                        {/* Body */}
                        <rect x="-6" y="0" width="12" height="20" fill="#059669" rx="2"/>
                        
                        {/* Arms */}
                        <rect x="6" y="4" width="4" height="15" fill="#059669" rx="1" transform="rotate(30 6 4)"/>
                        <rect x="-10" y="4" width="4" height="15" fill="#059669" rx="1" transform="rotate(-30 -10 4)"/>
                      </g>
                      
                      {/* Headlight */}
                      <circle cx="125" cy="30" r="6" fill="#FBBF24"/>
                    </g>
                    
                    {/* Road Line */}
                    <path d="M20 140 L180 140" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 5"/>
                  </svg>
                </div>
                <div className="mt-4 flex justify-center space-x-2">
                  <div className="w-8 h-2 bg-blue-400 rounded-full"></div>
                  <div className="w-8 h-2 bg-blue-400 rounded-full opacity-50"></div>
                  <div className="w-8 h-2 bg-blue-400 rounded-full opacity-30"></div>
                </div>
              </div>
            </div>
            
            {/* Connecting Line */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center justify-center space-x-12">
                <div className="text-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white text-sm">Apply</p>
                </div>
                <div className="w-12 h-0.5 bg-white/30"></div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white text-sm">Approve</p>
                </div>
                <div className="w-12 h-0.5 bg-white/30"></div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white text-sm">Disburse</p>
                </div>
                <div className="w-12 h-0.5 bg-white/30"></div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white text-sm">Grow</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats Banner */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-blue-100 text-xs">Active Loans</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">UGX 2.5B</p>
              <p className="text-blue-100 text-xs">Disbursed</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">98%</p>
              <p className="text-blue-100 text-xs">Repayment Rate</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">24hr</p>
              <p className="text-blue-100 text-xs">Approval Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50 p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Logo Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-lg mb-6">
              <div className="relative">
                <Bike className="h-10 w-10 text-white" />
                <Car className="h-6 w-6 text-yellow-300 absolute -top-2 -right-2" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">BINGO VINTAGE</h1>
            <div className="inline-flex items-center gap-3 bg-blue-100 px-6 py-2 rounded-full">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <p className="text-sm text-blue-700 font-medium uppercase tracking-wide">
                ASSET FINANCING PLATFORM
              </p>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
            <p className="text-gray-600 text-sm mt-4">
              Professional loan management for motorcycles and tuk-tuks
            </p>
          </div>
          
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
              <p className="text-gray-600 text-sm">Access your dashboard</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                  placeholder="Enter your username"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-12 transition text-sm"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-600">Stay signed in</span>
                </label>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 px-4 rounded-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-sm hover:shadow-xl"
              >
                {isLoading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Authenticating...</>
                ) : (
                  'Access Dashboard'
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-semibold text-blue-600 uppercase">Test Accounts</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">AD</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Administrator</p>
                      <p className="text-xs text-gray-500">Full system control</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <code className="text-blue-600 bg-white px-3 py-1 rounded text-xs font-mono border border-blue-200">admin123</code>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-cyan-600">LO</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Loan Officer</p>
                      <p className="text-xs text-gray-500">Loan processing</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <code className="text-cyan-600 bg-white px-3 py-1 rounded text-xs font-mono border border-cyan-200">*****</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-6 text-xs text-gray-500">
              <span>© {new Date().getFullYear()} Bingo Vintage</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span>Terms & Conditions</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span>Privacy Policy</span>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Need help? Email us at support@bingovintage.com
            </p>
          </div>
        </div>
      </div>

      {/* Global Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}