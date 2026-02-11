'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Banknote, 
  Bike, 
  User, 
  Calendar, 
  Percent, 
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { createLoan } from '@/features/loans/loan.api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreateLoanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get('type') || 'CASH';
  
  const [formData, setFormData] = useState({
    loan_type: defaultType,
    client_name: '',
    client_id: '',
    principal_amount: '',
    interest_rate: '5',
    duration_months: '3',
    start_date: new Date().toISOString().split('T')[0],
    collateral_details: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (apiError) setApiError('');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Client name is required';
    }
    
    if (!formData.principal_amount || parseFloat(formData.principal_amount) <= 0) {
      newErrors.principal_amount = 'Valid amount is required';
    }
    
    if (formData.loan_type === 'BIKE' && !formData.collateral_details.trim()) {
      newErrors.collateral_details = 'Collateral details are required for bike loans';
    }
    
    if (!formData.interest_rate || parseFloat(formData.interest_rate) <= 0) {
      newErrors.interest_rate = 'Valid interest rate is required';
    }
    
    if (!formData.duration_months || parseInt(formData.duration_months) <= 0) {
      newErrors.duration_months = 'Valid duration is required';
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
    setApiError('');
    
    try {
      const loanData = {
        ...formData,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate: parseFloat(formData.interest_rate),
        duration_months: parseInt(formData.duration_months),
        status: 'active'
      };
      
      await createLoan(loanData);
      router.push('/dashboard/loans');
      
    } catch (error: any) {
      console.error('Failed to create loan:', error);
      setApiError(error.message || 'Failed to create loan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loanTypes = [
    { id: 'CASH', name: 'Cash Loan', icon: Banknote, description: 'Standard cash loan without collateral', color: 'bg-blue-500' },
    { id: 'BIKE', name: 'Bike Loan', icon: Bike, description: 'Loan secured with motorcycle collateral', color: 'bg-orange-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/loans" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Loans
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create New Loan</h1>
          <p className="text-gray-600 mt-1">Fill in the details to create a new loan application</p>
        </div>
      </div>

      {/* Loan Type Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Select Loan Type</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loanTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, loan_type: type.id }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.loan_type === type.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${type.color} ${formData.loan_type === type.id ? 'opacity-100' : 'opacity-80'}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{type.name}</p>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                    {formData.loan_type === type.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Loan Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Information */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Client Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      name="client_name"
                      value={formData.client_name}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.client_name ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Enter client full name"
                    />
                    {errors.client_name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.client_name}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client ID (Optional)
                    </label>
                    <input
                      type="text"
                      name="client_id"
                      value={formData.client_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Client identification number"
                    />
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Loan Details</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Principal Amount (UGX) *
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">UGX</div>
                      <input
                        type="number"
                        name="principal_amount"
                        value={formData.principal_amount}
                        onChange={handleChange}
                        className={`w-full pl-12 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.principal_amount ? 'border-red-300' : 'border-gray-200'
                        }`}
                        placeholder="0.00"
                        min="0"
                        step="1000"
                      />
                    </div>
                    {errors.principal_amount && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.principal_amount}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interest Rate (%) *
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Percent className="w-4 h-4 text-gray-500" />
                      </div>
                      <input
                        type="number"
                        name="interest_rate"
                        value={formData.interest_rate}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.interest_rate ? 'border-red-300' : 'border-gray-200'
                        }`}
                        placeholder="5"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    {errors.interest_rate && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.interest_rate}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Months) *
                    </label>
                    <select
                      name="duration_months"
                      value={formData.duration_months}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.duration_months ? 'border-red-300' : 'border-gray-200'
                      }`}
                    >
                      <option value="1">1 Month</option>
                      <option value="2">2 Months</option>
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                      <option value="24">24 Months</option>
                    </select>
                    {errors.duration_months && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.duration_months}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                      </div>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bike Collateral Section (only for bike loans) */}
              {formData.loan_type === 'BIKE' && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Bike className="w-5 h-5 text-orange-600" />
                    <h2 className="font-semibold text-gray-900">Bike Collateral Details *</h2>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bike Details (Make, Model, Registration, Condition)
                    </label>
                    <textarea
                      name="collateral_details"
                      value={formData.collateral_details}
                      onChange={handleChange}
                      rows={3}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.collateral_details ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Enter bike make, model, registration number, condition, etc."
                    />
                    {errors.collateral_details && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.collateral_details}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes or comments about this loan..."
                />
              </div>
            </div>

            {/* API Error Message */}
            {apiError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {apiError}
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
              <Link
                href="/dashboard/loans"
                className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Loan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}