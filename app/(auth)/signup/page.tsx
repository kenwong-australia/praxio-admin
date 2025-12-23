'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Users, Sparkles, Brain, Mail, Shield, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export default function SignUpPage() {
  const router = useRouter();

  // Temporary kill-switch to prevent new self-serve signups
  const SIGNUPS_DISABLED = true;
  
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
  const [phoneNonDigitWarning, setPhoneNonDigitWarning] = useState(false);
  const [phoneFormatWarning, setPhoneFormatWarning] = useState(false);
  const [abnNonDigitWarning, setAbnNonDigitWarning] = useState(false);
  const [abnLookupLoading, setAbnLookupLoading] = useState(false);
  const [abnValidated, setAbnValidated] = useState<boolean | null>(null);
  const [abnValidatedValue, setAbnValidatedValue] = useState<string>('');
  const [hasEngaged, setHasEngaged] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [lastCheckedEmail, setLastCheckedEmail] = useState('');

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
    
    // Mark that user has engaged with the form
    setHasEngaged(true);
    
    // Format ABN (only digits, max 11)
    if (name === 'abn') {
      const hasNonDigits = /\D/.test(value);
      if (hasNonDigits) {
        setAbnNonDigitWarning(true);
        setTimeout(() => setAbnNonDigitWarning(false), 3000);
      }
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, [name]: digitsOnly }));
      // Reset validation status when ABN changes to a different value
      if (digitsOnly !== abnValidatedValue) {
        setAbnValidated(null);
      }
    } 
    // Format Australian phone number
    else if (name === 'phone') {
      // Check if user is trying to type non-digits (excluding formatting characters)
      // Compare the raw input (without formatting) to detect non-digit characters
      const rawInput = value.replace(/[()\s-]/g, '');
      if (rawInput.length > 0 && /\D/.test(rawInput)) {
        setPhoneNonDigitWarning(true);
        setTimeout(() => setPhoneNonDigitWarning(false), 3000);
      }
      const formatted = formatAustralianPhone(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
      // Clear format warning while typing (will be re-checked on blur)
      setPhoneFormatWarning(false);
    } 
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (name === 'email') {
        // Reset email existence state when user edits email
        setEmailExists(null);
        setLastCheckedEmail('');
      }
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneBlur = () => {
    // Validate phone format when user leaves the field
    if (formData.phone.trim()) {
      const digitsOnly = formData.phone.replace(/\D/g, '');
      if (digitsOnly.length === 10) {
        // If we have 10 digits, validate the format
        if (!validateAustralianPhone(formData.phone)) {
          setPhoneFormatWarning(true);
        } else {
          setPhoneFormatWarning(false);
        }
      } else if (digitsOnly.length > 0) {
        // If there are digits but not 10, show warning
        setPhoneFormatWarning(true);
      } else {
        setPhoneFormatWarning(false);
      }
    } else {
      setPhoneFormatWarning(false);
    }
  };

  // Email existence check (Firestore) - debounced
  useEffect(() => {
    const email = formData.email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!email || !isValidEmail) {
      setEmailExists(null);
      setEmailCheckLoading(false);
      return;
    }

    if (email === lastCheckedEmail) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setEmailCheckLoading(true);
      try {
        const response = await fetch('/api/users/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
          signal: controller.signal,
        });

        const data = await response.json();
        const exists = Boolean(data?.exists);
        setEmailExists(exists);
        setLastCheckedEmail(email);

        // If email already exists, we surface an inline message near the field (no auto-redirect)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Email check failed:', error);
          setEmailExists(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setEmailCheckLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [formData.email, lastCheckedEmail, router]);

  // ABN Lookup Effect - triggers when ABN reaches 11 digits (only once per ABN value)
  useEffect(() => {
    const lookupABN = async (abn: string, currentCompany: string) => {
      // Only lookup if:
      // 1. ABN is exactly 11 digits
      // 2. Not currently loading
      // 3. This ABN hasn't been validated yet (or it's a different ABN)
      if (abn.length !== 11 || abnLookupLoading || (abnValidated !== null && abn === abnValidatedValue)) {
        return;
      }

      setAbnLookupLoading(true);
      const toastId = toast.loading('Validating ABN...', {
        description: 'Checking Australian Business Register',
      });

      try {
        const response = await fetch('/api/abn-lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ abn }),
        });

        const data = await response.json();

        if (data.success && data.valid) {
          setAbnValidated(true);
          setAbnValidatedValue(abn); // Store the validated ABN value
          toast.success('ABN Verified', {
            id: toastId,
            description: data.businessName 
              ? `Business: ${data.businessName}`
              : 'ABN is valid and registered',
            duration: 5000,
          });

          // Auto-fill company name if found and company field is empty
          if (data.businessName && !currentCompany.trim()) {
            setFormData(prev => ({ ...prev, company: data.businessName }));
          }
        } else {
          setAbnValidated(false);
          setAbnValidatedValue(abn); // Store even failed validation to prevent re-validating
          toast.error('ABN Not Found', {
            id: toastId,
            description: data.error || 'This ABN is not registered in the Australian Business Register',
            duration: 5000,
          });
        }
      } catch (error) {
        setAbnValidated(false);
        setAbnValidatedValue(abn); // Store even failed validation to prevent re-validating
        toast.error('ABN Lookup Failed', {
          id: toastId,
          description: error instanceof Error ? error.message : 'Unable to verify ABN at this time',
          duration: 5000,
        });
      } finally {
        setAbnLookupLoading(false);
      }
    };

    // Debounce the lookup by 500ms after user stops typing
    const timeoutId = setTimeout(() => {
      lookupABN(formData.abn, formData.company);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.abn, formData.company, abnLookupLoading, abnValidated, abnValidatedValue]);

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    
    if (!formData.firstName.trim()) missing.push('First name');
    if (!formData.lastName.trim()) missing.push('Last name');
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      missing.push('Valid email');
    }
    if (emailExists === true) {
      missing.push('Use a different email (already registered)');
    }
    if (!formData.phone.trim() || !validateAustralianPhone(formData.phone)) missing.push('Valid phone number');
    if (!formData.company.trim()) missing.push('Company');
    if (!formData.abn.trim() || formData.abn.length !== 11) missing.push('11-digit ABN');
    if (!formData.password || formData.password.length < 8) missing.push('Password (min 8 characters)');
    if (!formData.confirmPassword || formData.password !== formData.confirmPassword) missing.push('Matching password confirmation');
    if (!agreedToTerms) missing.push('Terms & Conditions agreement');
    
    return missing;
  };

  const isFormReady = (): boolean => {
    return getMissingFields().length === 0;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (emailExists === true) {
      newErrors.email = 'An account already exists with this email. Please sign in instead.';
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
    
    // Mark that user has engaged (tried to submit)
    setHasEngaged(true);

    if (SIGNUPS_DISABLED) {
      toast.info('Signups are temporarily disabled', {
        description: 'Please check back soon or contact support.',
        duration: 4000,
      });
      return;
    }
    
    if (!validateForm() || emailExists === true) {
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();

      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      const displayName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Send verification email right after account creation
      try {
        await sendEmailVerification(user);
      } catch (error) {
        console.error('sendEmailVerification failed', error);
        toast.error('Verification email failed to send', {
          description: 'Please try resending from Settings.',
          duration: 5000,
        });
      }

      const idToken = await user.getIdToken();

      const provisionRes = await fetch('/api/users/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          company: formData.company.trim(),
          abn: formData.abn.trim(),
          displayName,
        }),
      });

      const provisionData = await provisionRes.json();
      if (!provisionRes.ok || !provisionData?.ok) {
        throw new Error(provisionData?.error || 'Provisioning failed');
      }

      toast.success('Account created!', {
        description: 'Verification email sent. Check your inbox to verify.',
        duration: 3000,
      });
      router.push('/praxio');
    } catch (error) {
      console.error('Signup failed', error);
      toast.error('Signup failed', {
        description:
          error instanceof Error ? error.message : 'Unable to create account right now.',
      });
    } finally {
      setLoading(false);
    }
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
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Section - Features (Desktop only) */}
          <div className="hidden lg:flex flex-col">
            {/* Desktop Features */}
            <div>
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
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Start your 7 day free trial
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      First
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                        errors.firstName
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    {errors.firstName && (
                      <p className="mt-0.5 text-xs text-red-600">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Last
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                        errors.lastName
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    {errors.lastName && (
                      <p className="mt-0.5 text-xs text-red-600">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                      errors.email
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {emailCheckLoading && (
                    <p className="mt-0.5 text-xs text-slate-500">Checking email...</p>
                  )}
                  {emailExists === true && !emailCheckLoading && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-amber-700">
                      <span>Account already exists.</span>
                      <Link
                        href="/signin"
                        className="inline-flex items-center rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      >
                        Go to sign in
                      </Link>
                    </div>
                  )}
                  {errors.email && (
                    <p className="mt-0.5 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handlePhoneBlur}
                    placeholder="(02) 1234-5678 or (0412) 345-678"
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                      errors.phone || phoneFormatWarning
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {phoneNonDigitWarning && (
                    <p className="mt-0.5 text-xs text-amber-600">Please enter only digits</p>
                  )}
                  {phoneFormatWarning && (
                    <p className="mt-0.5 text-xs text-amber-600">
                      Please enter a valid Australian phone number format (landline: (02) 1234-5678 or mobile: (0412) 345-678)
                    </p>
                  )}
                  {errors.phone && (
                    <p className="mt-0.5 text-xs text-red-600">{errors.phone}</p>
                  )}
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Enter your company"
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                      errors.company
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {errors.company && (
                    <p className="mt-0.5 text-xs text-red-600">{errors.company}</p>
                  )}
                </div>

                {/* ABN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      ABN
                    </label>
                    <div className="flex items-center gap-2">
                      {abnLookupLoading && (
                        <span className="text-xs text-slate-500 animate-pulse">Validating...</span>
                      )}
                      {abnValidated === true && !abnLookupLoading && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {abnValidated === false && !abnLookupLoading && (
                        <span className="text-xs text-red-600">Not found</span>
                      )}
                      <span className="text-xs text-slate-500">
                        {formData.abn.length}/11
                      </span>
                    </div>
                  </div>
                  <input
                    type="text"
                    name="abn"
                    value={formData.abn}
                    onChange={handleChange}
                    placeholder="Enter your 11 digit ABN"
                    maxLength={11}
                    disabled={abnLookupLoading}
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                      errors.abn
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : abnValidated === true
                        ? 'border-green-300 focus:ring-2 focus:ring-green-500 focus:border-green-500'
                        : abnValidated === false
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    } ${abnLookupLoading ? 'opacity-60 cursor-wait' : ''}`}
                  />
                  {abnNonDigitWarning && (
                    <p className="mt-0.5 text-xs text-amber-600">Please enter only digits</p>
                  )}
                  {errors.abn && (
                    <p className="mt-0.5 text-xs text-red-600">{errors.abn}</p>
                  )}
                </div>

                {/* General Error Message */}
                {Object.keys(errors).length > 0 && !errors.terms && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600">
                      Please complete all fields above
                    </p>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-colors ${
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
                    <p className="mt-0.5 text-xs text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm your password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-colors ${
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
                    <p className="mt-0.5 text-xs text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setHasEngaged(true);
                        setAgreedToTerms(e.target.checked);
                        if (errors.terms) {
                          setErrors(prev => ({ ...prev, terms: '' }));
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      Agree to{' '}
                      <Link href="https://www.praxio-ai.com.au/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Terms and Conditions
                      </Link>
                      {' '}and{' '}
                      <Link href="https://www.praxio-ai.com.au/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="mt-0.5 text-xs text-red-600">{errors.terms}</p>
                  )}
                </div>

                {/* Form Completion Helper */}
                {hasEngaged && !isFormReady() && !loading && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-900 mb-1">
                      Complete the following to continue:
                    </p>
                    <ul className="text-xs text-amber-800 space-y-0.5 list-disc list-inside max-h-24 overflow-y-auto pr-2">
                      {getMissingFields().map((field, index) => (
                        <li key={index} className="leading-tight">{field}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Success Message when form is ready */}
                {isFormReady() && !loading && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-medium text-green-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      All fields completed! You can now create your account.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={true} // temporarily disabled to block new signups
                  className={`w-full rounded-lg text-white font-medium py-2.5 px-4 transition-colors bg-slate-400 cursor-not-allowed`}
                  title="Signups are temporarily disabled"
                >
                  Signups temporarily disabled
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

