'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getClientById } from '@/features/clients/client.api';
import type { Client } from '@/shared/api-types';
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
          <Loader2 className="h-8 w-8 animate-spin text-bv-meta" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 max-w-bv mx-auto">
        <p className="text-sm font-semibold text-bv-text">Client not found</p>
        <p className="text-sm text-bv-muted mt-1">The record may have been removed or you do not have access.</p>
        <a href="/dashboard/clients" className="inline-block mt-4 text-sm font-medium text-bv-accent hover:underline">
          Back to clients
        </a>
      </div>
    );
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-UG', {
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
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const DetailItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div className="py-2">
      <dt className="text-xs font-medium text-bv-meta">{label}</dt>
      <dd className="text-sm font-semibold text-bv-text mt-0.5">{value ?? '-'}</dd>
    </div>
  );

  const tabs: { key: string; label: string }[] = [
    { key: 'overview',    label: 'Overview'    },
    { key: 'loans',       label: 'Loans'       },
    { key: 'personal',    label: 'Personal'    },
    { key: 'contact',     label: 'Contact'     },
    { key: 'employment',  label: 'Employment'  },
    { key: 'banking',     label: 'Banking'     },
    { key: 'kin',         label: 'Next of Kin' },
    { key: 'business',    label: 'Business'    },
    { key: 'references',  label: 'References'  },
    { key: 'system',      label: 'System'      },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-6">
      {/* Page header */}
      <div className="border-b border-bv-border pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-bv-meta mb-1">
            <button type="button" onClick={() => router.push('/dashboard/clients')} className="hover:underline text-bv-accent">Clients</button>
            {' / '}Profile
          </p>
          <h1 className="text-lg font-semibold text-bv-text">
            {client.first_name} {client.last_name}
          </h1>
          <p className="text-sm text-bv-muted mt-0.5">
            Borrower profile, KYC and linked loans. Use Edit to change registered details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard/clients')}
            className="text-sm border border-bv-border px-3 py-1.5 rounded-bv hover:bg-bv-hover text-bv-muted"
          >
            Back to list
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/clients/${params?.id}/edit`)}
            className="text-sm font-medium px-3 py-1.5 rounded-bv bg-bv-action hover:bg-bv-action-hover text-white flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — tabs */}
        <div className="lg:col-span-2 space-y-0">
          {/* Tab nav */}
          <div className="bg-bv-surface border border-bv-border rounded-bv overflow-hidden">
            <div className="border-b border-bv-border overflow-x-auto">
              <nav className="flex min-w-max">
                {tabs.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key as any)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === key
                        ? 'border-bv-action text-bv-accent'
                        : 'border-transparent text-bv-muted hover:text-bv-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-5">
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Avatar + name + badges */}
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 bg-bv-hover rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-bold text-bv-muted">
                        {client.first_name?.[0] || '?'}{client.last_name?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-bv-text">
                        {client.first_name} {client.last_name}
                      </h2>
                      <p className="text-xs text-bv-meta mt-0.5">Client since {formatDate(client.created_at)}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          client.status === 'active'
                            ? 'bg-bv-success-bg text-bv-success'
                            : 'bg-bv-hover text-bv-muted'
                        }`}>
                          {client.status || 'unknown'}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          client.verified
                            ? 'bg-bv-success-bg text-bv-success'
                            : 'bg-bv-warning-bg text-bv-warning'
                        }`}>
                          {client.verified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-bv-meta">Credit Score</p>
                      <p className="text-sm font-semibold text-bv-text tabular-nums">{client.credit_score ?? 'N/A'}</p>
                    </div>
                  </div>

                  {/* Quick stats inline row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-bv-border rounded-bv p-3 bg-bv-surface">
                    <div>
                      <p className="text-xs text-bv-meta">Monthly Income</p>
                      <p className="text-sm font-semibold text-bv-text tabular-nums">{formatCurrency(client.monthly_income)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-bv-meta">Loan Limit</p>
                      <p className="text-sm font-semibold text-bv-text tabular-nums">{formatCurrency(client.loan_limit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-bv-meta">Account Balance</p>
                      <p className="text-sm font-semibold text-bv-text tabular-nums">{formatCurrency(client.account_balance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-bv-meta">Sync Status</p>
                      <p className="text-sm font-semibold text-bv-text capitalize">{client.sync_status ?? 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loans */}
              {(activeTab as any) === 'loans' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-bv-text text-sm">Loan History</h3>
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/loans/create?clientId=${params?.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-bv-action text-white rounded-bv text-xs font-medium hover:bg-bv-action-hover"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Loan
                    </button>
                  </div>
                  {(!(client as any).loans || (client as any).loans.length === 0) ? (
                    <div className="text-center py-10 text-bv-meta">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No loans found for this client</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {((client as any).loans as any[]).map((loan: any) => {
                        const status = (loan.status || '').toUpperCase();
                        const statusCls: Record<string, string> = {
                          ACTIVE: 'bg-bv-success-bg text-bv-success',
                          DELINQUENT: 'bg-bv-danger-bg text-bv-danger',
                          COMPLETED: 'bg-bv-info-bg text-bv-accent',
                          PENDING_APPROVAL: 'bg-bv-warning-bg text-bv-warning',
                          REJECTED: 'bg-bv-hover text-bv-muted',
                        };
                        const fmtUGX = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
                        return (
                          <div
                            key={loan.id}
                            className="border border-bv-border rounded-bv p-4 hover:bg-bv-hover transition-colors cursor-pointer"
                            onClick={() => router.push(`/dashboard/loans/${loan.id}`)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-bold text-bv-text">
                                {loan.loanNumber || loan.loan_number || `#${loan.id}`}
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCls[status] || 'bg-bv-hover text-bv-meta'}`}>
                                {status}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs text-bv-meta">
                              <div>
                                <p className="font-semibold text-bv-text tabular-nums">{fmtUGX(loan.principalAmount ?? loan.principal_amount)}</p>
                                <p>Principal</p>
                              </div>
                              <div>
                                <p className="font-semibold text-bv-text tabular-nums">{fmtUGX(loan.balance)}</p>
                                <p>Balance</p>
                              </div>
                              <div>
                                <p className="font-semibold text-bv-text">{loan.loanType || loan.loan_type || 'CASH'}</p>
                                <p>Type</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Personal */}
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2">
                    <User className="h-4 w-4 text-bv-meta" />
                    Personal Information
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
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
                  </dl>
                </div>
              )}

              {/* Contact */}
              {activeTab === 'contact' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2">
                    <Phone className="h-4 w-4 text-bv-meta" />
                    Contact Information
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="Phone" value={client.phone} />
                    <DetailItem label="Alt Phone" value={client.alt_phone} />
                    <DetailItem label="Email" value={client.email} />
                    <DetailItem label="Address" value={client.address} />
                    <DetailItem label="City" value={client.city} />
                    <DetailItem label="State" value={client.state} />
                    <DetailItem label="Country" value={client.country} />
                    <DetailItem label="Postal Code" value={client.postal_code} />
                  </dl>
                </div>
              )}

              {/* Employment */}
              {activeTab === 'employment' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-bv-meta" />
                    Employment &amp; Income
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="Occupation" value={client.occupation} />
                    <DetailItem label="Employment Status" value={client.employment_status} />
                    <DetailItem label="Monthly Income" value={formatCurrency(client.monthly_income)} />
                  </dl>
                </div>
              )}

              {/* Banking */}
              {activeTab === 'banking' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-bv-meta" />
                    Banking Details
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="Bank Name" value={client.bank_name} />
                    <DetailItem label="Account Number" value={client.account_number} />
                    <DetailItem label="Branch" value={client.bank_branch} />
                    <DetailItem label="Account Balance" value={formatCurrency(client.account_balance)} />
                  </dl>
                </div>
              )}

              {/* Next of Kin */}
              {activeTab === 'kin' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2">
                    <Users className="h-4 w-4 text-bv-meta" />
                    Next of Kin
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                    <DetailItem label="Name" value={client.next_of_kin_name} />
                    <DetailItem label="Phone" value={client.next_of_kin_phone} />
                    <DetailItem label="Relationship" value={client.next_of_kin_relationship} />
                  </dl>
                </div>
              )}

              {/* Business */}
              {activeTab === 'business' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2">
                    <Building className="h-4 w-4 text-bv-meta" />
                    Business Information
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="Business Name" value={client.business_name} />
                    <DetailItem label="Business Type" value={client.business_type} />
                    <DetailItem label="Business Address" value={client.business_address} />
                  </dl>
                </div>
              )}

              {/* References */}
              {activeTab === 'references' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2">
                    <Users className="h-4 w-4 text-bv-meta" />
                    References
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="Reference 1 Name" value={client.reference1_name} />
                    <DetailItem label="Reference 1 Phone" value={client.reference1_phone} />
                    <DetailItem label="Reference 2 Name" value={client.reference2_name} />
                    <DetailItem label="Reference 2 Phone" value={client.reference2_phone} />
                  </dl>
                </div>
              )}

              {/* System */}
              {activeTab === 'system' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2">
                    <Shield className="h-4 w-4 text-bv-meta" />
                    System Information
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="Status" value={client.status} />
                    <DetailItem label="Verified" value={client.verified ? 'Yes' : 'No'} />
                    <DetailItem label="Verification Method" value={client.verification_method} />
                    <DetailItem label="Sync Status" value={client.sync_status} />
                    <DetailItem label="Credit Score" value={client.credit_score} />
                    <DetailItem label="Loan Limit" value={formatCurrency(client.loan_limit)} />
                    <DetailItem label="Created At" value={formatDate(client.created_at)} />
                    <DetailItem label="Updated At" value={formatDate(client.updated_at)} />
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Verification Status */}
          <div className="bg-bv-surface border border-bv-border rounded-bv p-4">
            <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-bv-meta" />
              Verification Status
            </h3>
            <div className={`p-3 rounded-bv flex items-center justify-between ${client.verified ? 'bg-bv-success-bg' : 'bg-bv-warning-bg'}`}>
              <span className={`text-sm font-medium ${client.verified ? 'text-bv-success' : 'text-bv-warning'}`}>
                {client.verified ? 'Fully verified' : 'Requires verification'}
              </span>
              {client.verified
                ? <CheckCircle className="h-4 w-4 text-bv-success" />
                : <XCircle className="h-4 w-4 text-bv-warning" />
              }
            </div>
            <div className="mt-3 pt-3 border-t border-bv-border space-y-0">
              <DetailItem label="Method" value={client.verification_method} />
              <DetailItem label="Sync Status" value={client.sync_status} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-bv-surface border border-bv-border rounded-bv p-4">
            <h3 className="text-sm font-semibold text-bv-text mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/clients/${params?.id}/edit`)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-bv-border rounded-bv hover:bg-bv-hover text-bv-text"
              >
                <Pencil className="h-4 w-4 text-bv-meta" />
                Edit Client Details
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/loans/create?clientId=${params?.id}`)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-bv-border rounded-bv hover:bg-bv-hover text-bv-text"
              >
                <DollarSign className="h-4 w-4 text-bv-meta" />
                Create New Loan
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/payments?clientId=${params?.id}`)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-bv-border rounded-bv hover:bg-bv-hover text-bv-text"
              >
                <CreditCard className="h-4 w-4 text-bv-meta" />
                Record Payment
              </button>
              {client.phone && (
                <button
                  type="button"
                  onClick={() => window.open(`tel:${client.phone}`)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-bv-border rounded-bv hover:bg-bv-hover text-bv-text"
                >
                  <Phone className="h-4 w-4 text-bv-meta" />
                  Call {client.phone}
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push(`/dashboard/schedules?clientId=${params?.id}`)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-bv-border rounded-bv hover:bg-bv-hover text-bv-text"
              >
                <FileText className="h-4 w-4 text-bv-meta" />
                View Schedules
              </button>
            </div>
          </div>

          {/* Client Notes */}
          {client.notes && (
            <div className="bg-bv-surface border border-bv-border rounded-bv p-4">
              <h3 className="text-sm font-semibold text-bv-text flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-bv-meta" />
                Client Notes
              </h3>
              <p className="text-sm text-bv-muted whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          {/* System Information */}
          <div className="bg-bv-surface border border-bv-border rounded-bv p-4">
            <h3 className="text-sm font-semibold text-bv-text mb-2">System Information</h3>
            <dl className="space-y-0">
              <DetailItem label="Client ID" value={client.id} />
              <DetailItem label="Created On" value={formatDate(client.created_at)} />
              <DetailItem label="Last Updated" value={formatDate(client.updated_at)} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
