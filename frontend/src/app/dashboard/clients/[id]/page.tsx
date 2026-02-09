'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getClientById } from '@/features/clients/client.api';
import { Client } from '@/features/clients/client.types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Pencil, Loader2, User, Phone, Mail, MapPin, 
  Briefcase, Banknote, Users, Building, FileText, Shield,
  CheckCircle, XCircle, Clock, TrendingUp, DollarSign,
  CreditCard, Calendar, Home, ExternalLink, Plus
} from 'lucide-react';
import { toast } from 'sonner';

export default function ViewClientPage() {
  const router = useRouter();
  const params = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'contact' | 'employment' | 'banking' | 'kin' | 'business' | 'references' | 'system'>('overview');

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;
    
    const loadClient = async () => {
      try {
        setIsLoading(true);
        const data = await getClientById(id);
        setClient(data);
      } catch (error) {
        toast.error('Failed to load client');
        router.push('/dashboard/clients');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClient();
  }, [params?.id]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!client) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'UGX 0';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const DetailItem = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="py-2">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold mt-1">{value ?? '-'}</dd>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/dashboard/clients')}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {client.first_name} {client.last_name}
              </h1>
              <p className="text-muted-foreground">Client Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/clients')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => router.push(`/dashboard/clients/${params?.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs Navigation */}
          <Card>
            <div className="border-b">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('personal')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'personal'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setActiveTab('contact')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'contact'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  Contact
                </button>
                <button
                  onClick={() => setActiveTab('employment')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'employment'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  Employment
                </button>
                <button
                  onClick={() => setActiveTab('banking')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'banking'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  Banking
                </button>
                <button
                  onClick={() => setActiveTab('kin')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'kin'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  Next of Kin
                </button>
                <button
                  onClick={() => setActiveTab('business')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'business'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  Business
                </button>
                <button
                  onClick={() => setActiveTab('references')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'references'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  References
                </button>
                <button
                  onClick={() => setActiveTab('system')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'system'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  System
                </button>
              </nav>
            </div>

            <CardContent className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Client Profile Card */}
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary">
                            {client.first_name?.[0] || '?'}{client.last_name?.[0] || '?'}
                          </span>
                        </div>
                        <div className="ml-6">
                          <h2 className="text-2xl font-bold">
                            {client.first_name} {client.last_name}
                          </h2>
                          <p className="text-muted-foreground">Client since {formatDate(client.created_at)}</p>
                          <div className="flex items-center mt-2">
                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="mr-2">
                              {client.status}
                            </Badge>
                            <Badge variant={client.verified ? 'default' : 'secondary'}>
                              {client.verified ? 'Verified' : 'Not Verified'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          Credit Score
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {client.credit_score || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">Monthly Income</p>
                          <p className="text-lg font-bold">{formatCurrency(client.monthly_income)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">Loan Limit</p>
                          <p className="text-lg font-bold">{formatCurrency(client.loan_limit)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">Account Balance</p>
                          <p className="text-lg font-bold">{formatCurrency(client.account_balance)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">Sync Status</p>
                          <p className="text-lg font-bold capitalize">{client.sync_status || 'N/A'}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Tab */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <User className="h-5 w-5 mr-2 text-muted-foreground" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DetailItem label="First Name" value={client.first_name} />
                      <DetailItem label="Last Name" value={client.last_name} />
                      <DetailItem label="Full Name" value={client.full_name} />
                      <DetailItem label="Gender" value={client.gender} />
                      <DetailItem label="Date of Birth" value={formatDate(client.date_of_birth)} />
                      <DetailItem label="Marital Status" value={client.marital_status} />
                      <DetailItem label="Nationality" value={client.nationality} />
                      <DetailItem label="NIN" value={client.nin} />
                      <DetailItem label="ID Number" value={client.id_number} />
                      <DetailItem label="Tax ID" value={client.tax_id} />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === 'contact' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DetailItem label="Phone" value={client.phone} />
                      <DetailItem label="Alt Phone" value={client.alt_phone} />
                      <DetailItem label="Email" value={client.email} />
                      <DetailItem label="Address" value={client.address} />
                      <DetailItem label="City" value={client.city} />
                      <DetailItem label="State" value={client.state} />
                      <DetailItem label="Country" value={client.country} />
                      <DetailItem label="Postal Code" value={client.postal_code} />
                    </div>
                  </div>
                </div>
              )}

              {/* Employment Tab */}
              {activeTab === 'employment' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Briefcase className="h-5 w-5 mr-2 text-muted-foreground" />
                      Employment & Income
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DetailItem label="Occupation" value={client.occupation} />
                      <DetailItem label="Employment Status" value={client.employment_status} />
                      <DetailItem label="Monthly Income" value={formatCurrency(client.monthly_income)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Banking Tab */}
              {activeTab === 'banking' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Banknote className="h-5 w-5 mr-2 text-muted-foreground" />
                      Banking Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DetailItem label="Bank Name" value={client.bank_name} />
                      <DetailItem label="Account Number" value={client.account_number} />
                      <DetailItem label="Branch" value={client.bank_branch} />
                      <DetailItem label="Account Balance" value={formatCurrency(client.account_balance)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Next of Kin Tab */}
              {activeTab === 'kin' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                      Next of Kin
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <DetailItem label="Name" value={client.next_of_kin_name} />
                      <DetailItem label="Phone" value={client.next_of_kin_phone} />
                      <DetailItem label="Relationship" value={client.next_of_kin_relationship} />
                    </div>
                  </div>
                </div>
              )}

              {/* Business Tab */}
              {activeTab === 'business' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Building className="h-5 w-5 mr-2 text-muted-foreground" />
                      Business Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DetailItem label="Business Name" value={client.business_name} />
                      <DetailItem label="Business Type" value={client.business_type} />
                      <DetailItem label="Business Address" value={client.business_address} />
                    </div>
                  </div>
                </div>
              )}

              {/* References Tab */}
              {activeTab === 'references' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                      References
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DetailItem label="Reference 1 Name" value={client.reference1_name} />
                      <DetailItem label="Reference 1 Phone" value={client.reference1_phone} />
                      <DetailItem label="Reference 2 Name" value={client.reference2_name} />
                      <DetailItem label="Reference 2 Phone" value={client.reference2_phone} />
                    </div>
                  </div>
                </div>
              )}

              {/* System Tab */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                      System Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DetailItem label="Status" value={client.status} />
                      <DetailItem label="Verified" value={client.verified ? 'Yes' : 'No'} />
                      <DetailItem label="Verification Method" value={client.verification_method} />
                      <DetailItem label="Sync Status" value={client.sync_status} />
                      <DetailItem label="Credit Score" value={client.credit_score} />
                      <DetailItem label="Loan Limit" value={formatCurrency(client.loan_limit)} />
                      <DetailItem label="Created At" value={formatDate(client.created_at)} />
                      <DetailItem label="Updated At" value={formatDate(client.updated_at)} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Quick Actions */}
        <div className="space-y-6">
          {/* Verification Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`p-4 rounded-lg ${client.verified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Verification Status</span>
                  {client.verified ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <p className="text-sm mt-2">
                  {client.verified 
                    ? 'Client is fully verified' 
                    : 'Client requires verification'
                  }
                </p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Verification Details</h4>
                <DetailItem label="Method" value={client.verification_method} />
                <DetailItem label="Sync Status" value={client.sync_status} />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/dashboard/clients/${params?.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Client Details
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Create New Loan
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
              >
                <Phone className="mr-2 h-4 w-4" />
                Contact Client
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Statement
              </Button>
            </CardContent>
          </Card>

          {/* Client Notes */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                  Client Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailItem label="Client ID" value={client.id} />
              <DetailItem label="Created On" value={formatDate(client.created_at)} />
              <DetailItem label="Last Updated" value={formatDate(client.updated_at)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}