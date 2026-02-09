'use client';

import { useState, useEffect } from 'react';
import { Client } from './client.types';

interface ClientFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Client>;
  onSubmit: (data: Partial<Client>) => Promise<void>;
}

// Helper function to check if a value is a Date object
const isDateObject = (value: unknown): value is Date => {
  return value instanceof Date;
};

export function ClientForm({ mode, initialData, onSubmit }: ClientFormProps) {
  const [form, setForm] = useState<Partial<Client>>({
    status: 'ACTIVE',
    verified: false,
    ...initialData,
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof Client, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Convert date strings to proper format for input[type="date"]
      const processedData = { ...initialData };
      
      // Handle date_of_birth if it exists
      if (processedData.date_of_birth) {
        const dateValue = processedData.date_of_birth;
        
        // Check if it's a Date object
        if (isDateObject(dateValue)) {
          processedData.date_of_birth = dateValue.toISOString().split('T')[0] as any;
        } else if (typeof dateValue === 'string') {
          // Try to parse and format the string
          try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              processedData.date_of_birth = date.toISOString().split('T')[0] as any;
            }
          } catch (e) {
            // Keep the original value if parsing fails
          }
        }
      }
      
      setForm(prev => ({ ...prev, ...processedData }));
    }
  }, [initialData]);

  const update = (key: keyof Client, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Client, string>> = {};
    
    if (!form.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }
    
    if (!form.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (form.phone && !/^[\d\s\-\+\(\)]+$/.test(form.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    
    if (form.monthly_income && form.monthly_income < 0) {
      newErrors.monthly_income = 'Income cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload: Partial<Client> = {
        ...form,
        full_name: `${form.first_name ?? ''} ${form.last_name ?? ''}`.trim(),
      };
      
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = (hasError: boolean = false) => 
    `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
      hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
    }`;

  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  // Helper function to safely get input value
  const getInputValue = (field: keyof Client, type: string = 'text'): string | number => {
    const value = form[field];
    
    // Handle undefined or null
    if (value === undefined || value === null) {
      return '';
    }
    
    // Handle number type
    if (type === 'number') {
      // Convert value to number if it's a string
      if (typeof value === 'string') {
        return value === '' ? '' : Number(value);
      }
      return value as number;
    }
    
    // Handle date type - ensure it's in YYYY-MM-DD format for date inputs
    if (type === 'date') {
      if (isDateObject(value)) {
        return value.toISOString().split('T')[0];
      }
      if (typeof value === 'string') {
        // If it's already in the correct format, return it
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return value;
        }
        // Try to parse and format
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          // If parsing fails, return empty string
        }
      }
      return '';
    }
    
    // For all other types, convert to string
    return String(value);
  };

  const renderInput = (
    label: string,
    field: keyof Client,
    type: string = 'text',
    placeholder: string = '',
    required: boolean = false
  ) => (
    <div>
      <label htmlFor={String(field)} className={labelClasses}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={String(field)}
        type={type}
        placeholder={placeholder}
        value={getInputValue(field, type)}
        onChange={e => {
          if (type === 'number') {
            update(field, e.target.value === '' ? '' : Number(e.target.value));
          } else {
            update(field, e.target.value);
          }
        }}
        className={inputClasses(!!errors[field])}
        required={required}
      />
      {errors[field] && (
        <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
      )}
    </div>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </section>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto p-4">
      {/* Personal Information */}
      {renderSection('Personal Information',
        <>
          {renderInput('First Name', 'first_name', 'text', 'John', true)}
          {renderInput('Last Name', 'last_name', 'text', 'Doe', true)}
          {renderInput('Date of Birth', 'date_of_birth', 'date')}
          <div>
            <label htmlFor="gender" className={labelClasses}>Gender</label>
            <select
              id="gender"
              value={form.gender || ''}
              onChange={e => update('gender', e.target.value)}
              className={inputClasses()}
            >
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label htmlFor="marital_status" className={labelClasses}>Marital Status</label>
            <select
              id="marital_status"
              value={form.marital_status || ''}
              onChange={e => update('marital_status', e.target.value)}
              className={inputClasses()}
            >
              <option value="">Select status</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
              <option value="SEPARATED">Separated</option>
            </select>
          </div>
        </>
      )}

      {/* Contact Information */}
      {renderSection('Contact Information',
        <>
          {renderInput('Phone Number', 'phone', 'tel', '+1234567890')}
          {renderInput('Email Address', 'email', 'email', 'john.doe@example.com')}
          {renderInput('Address', 'address', 'text', '123 Main St, City, Country')}
        </>
      )}

      {/* Identification */}
      {renderSection('Identification',
        <>
          {renderInput('National ID (NIN)', 'nin', 'text', '1234567890')}
          {renderInput('ID Number', 'id_number', 'text', 'ID123456')}
          {renderInput('Tax ID', 'tax_id', 'text', 'TAX789012')}
        </>
      )}

      {/* Employment */}
      {renderSection('Employment Information',
        <>
          {renderInput('Occupation', 'occupation', 'text', 'Software Engineer')}
          <div>
            <label htmlFor="employment_status" className={labelClasses}>Employment Status</label>
            <select
              id="employment_status"
              value={form.employment_status || ''}
              onChange={e => update('employment_status', e.target.value)}
              className={inputClasses()}
            >
              <option value="">Select status</option>
              <option value="EMPLOYED">Employed</option>
              <option value="SELF_EMPLOYED">Self-Employed</option>
              <option value="UNEMPLOYED">Unemployed</option>
              <option value="RETIRED">Retired</option>
              <option value="STUDENT">Student</option>
            </select>
          </div>
          {renderInput('Monthly Income', 'monthly_income', 'number', '0', false)}
        </>
      )}

      {/* Bank Details */}
      {renderSection('Bank Details',
        <>
          {renderInput('Bank Name', 'bank_name', 'text', 'Example Bank')}
          {renderInput('Account Number', 'account_number', 'text', '123456789')}
          {renderInput('Branch', 'bank_branch', 'text', 'Main Branch')}
        </>
      )}

      {/* Next of Kin */}
      {renderSection('Next of Kin',
        <>
          {renderInput('Full Name', 'next_of_kin_name', 'text', 'Jane Doe')}
          {renderInput('Phone Number', 'next_of_kin_phone', 'tel', '+1234567890')}
          {renderInput('Relationship', 'next_of_kin_relationship', 'text', 'Spouse')}
        </>
      )}

      {/* System */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">System Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="status" className={labelClasses}>Client Status</label>
            <select
              id="status"
              value={form.status}
              onChange={e => update('status', e.target.value)}
              className={inputClasses()}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="verified"
              checked={form.verified || false}
              onChange={e => update('verified', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="verified" className="text-gray-700 font-medium">
              Verified Client
            </label>
          </div>
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            mode === 'create' ? 'Create Client' : 'Update Client'
          )}
        </button>
      </div>
    </form>
  );
}