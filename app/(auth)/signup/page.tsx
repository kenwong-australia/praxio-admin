'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Users, Sparkles, Brain, Mail, Shield, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    abn: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const formatAustralianPhone = (value: string): string => {
    // Remove all non-digits and limit to 10 digits
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    
    // Mobile number (starts with 04)
    if (digitsOnly.startsWith('04')) {
      if (digitsOnly.length <= 2) {
        return digitsOnly;
      } else if (digitsOnly.length <= 4) {
        return `(${digitsOnly})`;
      } else if (digitsOnly.length <= 7) {
        return `(${digitsOnly.slice(0, 4)}) ${digitsOnly.slice(4)}`;
      } else {
        return `(${digitsOnly.slice(0, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7, 10)}`;
      }
    }
    // Landline number (starts with area code 02, 03, 07, 08)
    else {
      if (digitsOnly.length <= 2) {
        return digitsOnly.length > 0 ? `(${digitsOnly}` : '';
      } else if (digitsOnly.length <= 4) {
        return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2)}`;
      } else if (digitsOnly.length <= 8) {
        return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2)}`;
      } else {
        return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6, 10)}`;
      }
    }
  };

  const validateAustralianPhone = (phone: string): boolean => {
    // Remove all formatting
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Mobile: (04xx) xxx-xxx = 10 digits starting with 04
    const mobilePattern = /^04\d{8}$/;
    
    // Landline: (xx) xxxx-xxxx = 10 digits, area code starts with 02, 03, 07, or 08
    const landlinePattern = /^(02|03|07|08)\d{8}$/;
    
    return mobilePattern.test(digitsOnly) || landlinePattern.test(digitsOnly);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Format ABN (only digits, max 11)
    if (name === 'abn') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, [name]: digitsOnly }));
    } 
    // Format Australian phone number
    else if (name === 'phone') {
      const formatted = formatAustralianPhone(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } 
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validateAustralianPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid Australian phone number (landline: (xx) xxxx-xxxx or mobile: (xxxx) xxx-xxx)';
    }
    if (!formData.company.trim()) newErrors.company = 'Company is required';
    if (!formData.abn.trim()) {
      newErrors.abn = 'ABN is required';
    } else if (formData.abn.length !== 11) {
      newErrors.abn = 'ABN must be 11 digits';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the Terms and Conditions and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    // Mock submission - will be wired up later
    setTimeout(() => {
      setLoading(false);
      // router.push('/signin?message=account_created');
      alert('Sign up functionality will be wired up later. Form validated successfully!');
    }, 1000);
  };

  const features = [
    {
      icon: Users,
      title: 'Built for Accountants & Tax Professionals',
      description: 'Designed specifically for Australian tax professionals',
    },
    {
      icon: Sparkles,
      title: 'Smart, Ongoing Chat',
      description: 'Continue conversations and refine your research',
    },
    {
      icon: Brain,
      title: 'Reliable, Cited Answers',
      description: 'Get accurate answers with proper citations',
    },
    {
      icon: Mail,
      title: 'Client-ready Output',
      description: 'Generate professional client-ready documents',
    },
    {
      icon: Shield,
      title: 'Enterprise-Grade Security You Can Trust',
      description: 'Your data is protected with industry-leading security',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Section - Features */}
          <div className="flex flex-col">
            {/* Mobile Header - Shown on small screens */}
            <div className="lg:hidden text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Image
                  src="/Praxio Logo clean-12 (logo only).png"
                  alt="Praxio AI"
                  width={40}
                  height={40}
                  priority
                  className="object-contain"
                />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Praxio AI Tax Assistant
                </h1>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Your AI-powered Australian tax assistant
              </h2>
              <p className="text-base text-slate-600">
                Delivers fast, cited research and clear outputs
              </p>
            </div>

            {/* Desktop Features - Hidden on mobile */}
            <div className="hidden lg:block">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src="/Praxio Logo clean-12 (logo only).png"
                    alt="Praxio AI"
                    width={40}
                    height={40}
                    priority
                    className="object-contain"
                  />
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Praxio AI Tax Assistant
                  </h1>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Your AI-powered Australian tax assistant
                </h2>
                <p className="text-lg text-slate-600">
                  Delivers fast, cited research and clear outputs
                </p>
              </div>

              <div className="space-y-5">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <feature.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600 mt-8">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <span>Trusted by tax and accounting professionals Australia wide</span>
              </div>
            </div>
          </div>

          {/* Right Section - Signup Form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Start your 7 day free trial
                </h2>
                <p className="text-sm text-slate-600">
                  Create your account to get started
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      First
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                        errors.firstName
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Last
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                        errors.lastName
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                      errors.email
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(02) 1234-5678 or (0412) 345-678"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                      errors.phone
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                  )}
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Enter your company"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                      errors.company
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {errors.company && (
                    <p className="mt-1 text-xs text-red-600">{errors.company}</p>
                  )}
                </div>

                {/* ABN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      ABN
                    </label>
                    <span className="text-xs text-slate-500">
                      {formData.abn.length}/11
                    </span>
                  </div>
                  <input
                    type="text"
                    name="abn"
                    value={formData.abn}
                    onChange={handleChange}
                    placeholder="Enter your 11 digit ABN"
                    maxLength={11}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                      errors.abn
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {errors.abn && (
                    <p className="mt-1 text-xs text-red-600">{errors.abn}</p>
                  )}
                </div>

                {/* General Error Message */}
                {Object.keys(errors).length > 0 && !errors.terms && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">
                      Please complete all fields above
                    </p>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition-colors ${
                        errors.password
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm your password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition-colors ${
                        errors.confirmPassword
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (errors.terms) {
                          setErrors(prev => ({ ...prev, terms: '' }));
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">
                      Agree to{' '}
                      <Link href="/terms" className="text-blue-600 hover:underline">
                        Terms and Conditions
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="mt-1 text-xs text-red-600">{errors.terms}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Create Account and Start 7 Day Trial'}
                </button>
              </form>

              {/* Sign In Link */}
              <p className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link href="/signin" className="text-blue-600 hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

