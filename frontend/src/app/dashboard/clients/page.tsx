'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Eye, Edit, Trash2, User, Phone, Mail, 
  Calendar, AlertCircle, CheckCircle, 
  Shield, ShieldCheck, ShieldAlert, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type { Client } from '@/shared/api-types';

interface DBClient {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  nin?: string;
  idNumber?: string;
  occupation?: string;
  employmentStatus?: string;
  monthlyIncome?: string;
  bankName?: string;
  accountNumber?: string;
  bankBranch?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  nextOfKinRelationship?: string;
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  loans?: any[];
}

// Helper function to convert API response to Client type
const apiClientToClient = (dbClient: DBClient): Client => {
  const address = dbClient.city || dbClient.state || dbClient.country ? 
    `${dbClient.city || ''}${dbClient.city && dbClient.state ? ', ' : ''}${dbClient.state || ''}${(dbClient.city || dbClient.state) && dbClient.country ? ', ' : ''}${dbClient.country || ''}`.trim() :
    dbClient.address || '';

  return {
    id: dbClient.id.toString(),
    first_name: dbClient.firstName || '',
    last_name: dbClient.lastName || '',
    full_name: dbClient.fullName || `${dbClient.firstName || ''} ${dbClient.lastName || ''}`.trim(),
    email: dbClient.email || '',
    phone: dbClient.phone || '',
    nin: dbClient.nin || '',
    id_number: dbClient.idNumber,
    date_of_birth: dbClient.dateOfBirth || '',
    gender: dbClient.gender || '',
    marital_status: dbClient.maritalStatus || '',
    address: address,
    city: dbClient.city || '',
    state: dbClient.state || '',
    country: dbClient.country || '',
    postal_code: dbClient.postalCode || '',
    occupation: dbClient.occupation || '',
    employment_status: dbClient.employmentStatus || '',
    monthly_income: dbClient.monthlyIncome ? parseFloat(dbClient.monthlyIncome) : 0,
    tax_id: undefined,
    bank_name: dbClient.bankName || '',
    account_number: dbClient.accountNumber || '',
    bank_branch: dbClient.bankBranch || '',
    next_of_kin_name: dbClient.nextOfKinName || '',
    next_of_kin_phone: dbClient.nextOfKinPhone || '',
    next_of_kin_relationship: dbClient.nextOfKinRelationship || '',
    business_name: dbClient.businessName || '',
    business_type: dbClient.businessType || '',
    business_address: dbClient.businessAddress || '',
    status: dbClient.status || 'active',
    verified: false,
    created_at: dbClient.createdAt || new Date().toISOString(),
    updated_at: dbClient.updatedAt || new Date().toISOString(),
    nationality: undefined,
    account_balance: undefined,
    verification_method: undefined,
    sync_status: undefined,
    credit_score: undefined,
    loan_limit: undefined,
    justification: undefined,
    alt_phone: undefined,
    reference1_name: undefined,
    reference1_phone: undefined,
    reference2_name: undefined,
    reference2_phone: undefined,
    notes: undefined
  };
};

export default function ClientsPage() {
  const router = useRouter();
  const { user, can } = useAuth();
  const role      = (user?.role ?? '').toLowerCase();
  const isAdmin   = role === 'admin' || role === 'superadmin';
  const canEdit   = isAdmin || role === 'manager' || can('client.edit');
  const canDelete = isAdmin;
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'kyc_complete' | 'kyc_incomplete'>('all');

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [search, clients, activeTab]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await api.get('/clients') as { success: boolean; data?: DBClient[]; message?: string };

      if (response.success && Array.isArray(response.data)) {
        const formattedClients = response.data.map(apiClientToClient);
        setClients(formattedClients);
        setFilteredClients(formattedClients);
      } else {
        throw new Error(response.message || 'Failed to fetch clients');
      }
    } catch (error: any) {
      console.error('Failed to fetch clients:', error);
      setLoadError(error?.message || 'Could not load clients. Check connection and try again.');
      toast.error('Failed to load clients from database');
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(search.toLowerCase()) ||
                           client.email?.toLowerCase().includes(search.toLowerCase()) ||
                           client.phone?.includes(search) ||
                           client.id_number?.includes(search) ||
                           client.nin?.includes(search);
      
      if (!matchesSearch) return false;
      
      if (activeTab === 'active') return client.status === 'active';
      if (activeTab === 'inactive') return client.status === 'inactive';
      if (activeTab === 'kyc_complete') return isClientKYCComplete(client);
      if (activeTab === 'kyc_incomplete') return !isClientKYCComplete(client);
      
      return true;
    });
    
    setFilteredClients(filtered);
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const response = await (api as any).delete(`/clients/${id}`);
      if (response.success) {
        setClients(clients.filter(client => client.id !== id));
        setDeleteConfirm(null);
        toast.success('Client deleted successfully!');
      } else {
        throw new Error(response.message || 'API Failure');
      }
    } catch (error: any) {
      console.error('Failed to delete client:', error);
      toast.error('Failed to delete client');
    }
  };

  const getKYCProgress = (client: Client): number => {
    let completedFields = 0;
    const totalFields = 20;
    
    const coreFields = [
      client.first_name, client.last_name, client.email, client.phone, client.nin,
      client.date_of_birth, client.gender, client.next_of_kin_name, client.next_of_kin_phone
    ];
    completedFields += coreFields.filter(field => 
      field !== undefined && field !== null && field !== ''
    ).length;
    
    const addressFields = [client.address, client.city, client.state, client.country];
    const hasAddress = addressFields.some(field => field && field !== '');
    if (hasAddress) completedFields += 1;
    
    if (client.occupation || client.employment_status || client.monthly_income) {
      completedFields += 1;
    }
    
    if (client.bank_name || client.account_number) {
      completedFields += 1;
    }
    
    return Math.round((completedFields / totalFields) * 100);
  };

  const getKYCStatus = (client: Client): { text: string; cls: string; icon: any } => {
    const progress = getKYCProgress(client);
    
    if (progress >= 90) {
      return { 
        text: 'KYC Complete', 
        cls: 'bg-bv-success-bg text-bv-success',
        icon: ShieldCheck,
      };
    } else if (progress >= 50) {
      return { 
        text: 'KYC Partial', 
        cls: 'bg-bv-warning-bg text-bv-warning',
        icon: Shield,
      };
    } else {
      return { 
        text: 'KYC Incomplete', 
        cls: 'bg-bv-danger-bg text-bv-danger',
        icon: ShieldAlert,
      };
    }
  };

  const isClientKYCComplete = (client: Client): boolean => {
    return getKYCProgress(client) >= 90;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-UG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const kycStats = {
    complete: clients.filter(client => isClientKYCComplete(client)).length,
    partial: clients.filter(client => {
      const progress = getKYCProgress(client);
      return progress >= 50 && progress < 90;
    }).length,
    incomplete: clients.filter(client => getKYCProgress(client) < 50).length,
    averageProgress: clients.length > 0 
      ? Math.round(clients.reduce((sum, client) => sum + getKYCProgress(client), 0) / clients.length)
      : 0
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-bv mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bv-border pb-4">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">Clients</h1>
          <p className="text-sm text-bv-muted mt-0.5">
            Borrower records for lending. Register a client before creating a loan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchClients()}
            disabled={loading}
            className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded-bv hover:bg-bv-hover disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/clients/create')}
            className="text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded-bv hover:bg-bv-action-hover"
          >
            Register client
          </button>
        </div>
      </div>

      {loadError && (
        <div className="border border-bv-danger/30 bg-bv-danger-bg text-bv-danger text-sm px-3 py-2 rounded-bv flex flex-wrap items-center justify-between gap-2">
          <span>{loadError}</span>
          <button type="button" onClick={() => fetchClients()} className="font-medium underline">Retry</button>
        </div>
      )}

      {/* Book counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border border-bv-border rounded-bv p-4 bg-bv-surface">
        <div>
          <p className="text-xs text-bv-muted">Total</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : clients.length}</p>
        </div>
        <div>
          <p className="text-xs text-bv-muted">Active</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">
            {loading ? '…' : clients.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div>
          <p className="text-xs text-bv-muted">KYC complete</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : kycStats.complete}</p>
        </div>
        <div>
          <p className="text-xs text-bv-muted">KYC incomplete / partial</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">
            {loading ? '…' : (kycStats.incomplete + kycStats.partial)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All ({clients.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({clients.filter(c => c.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({clients.filter(c => c.status === 'inactive').length})</TabsTrigger>
          <TabsTrigger value="kyc_complete">
            <ShieldCheck className="h-4 w-4 mr-1" />
            KYC Complete ({kycStats.complete})
          </TabsTrigger>
          <TabsTrigger value="kyc_incomplete">
            <ShieldAlert className="h-4 w-4 mr-1" />
            KYC Incomplete ({kycStats.partial + kycStats.incomplete})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bv-meta pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone, NIN or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-bv-surface border border-bv-border rounded-bv text-bv-text placeholder:text-bv-meta focus:outline-none focus:ring-1 focus:ring-bv-action"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-56">
          <Filter className="h-4 w-4 text-bv-meta flex-shrink-0" />
          <select
            className="flex-1 px-3 py-2 text-sm bg-bv-surface border border-bv-border rounded-bv text-bv-text focus:outline-none focus:ring-1 focus:ring-bv-action"
          >
            <option value="">Sort: Newest</option>
            <option value="name">Name A–Z</option>
            <option value="kyc">KYC Progress</option>
          </select>
        </div>
      </div>

      {/* Clients table */}
      <div className="bg-bv-surface border border-bv-border rounded-bv overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-bv-border border-t-bv-action" role="status" aria-label="Loading" />
            <p className="text-sm font-semibold text-bv-text">Bingo Vintage <span className="text-bv-meta font-normal">· loading clients</span></p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <p className="text-sm font-semibold text-bv-text">No clients to show</p>
            <p className="mt-1 text-sm text-bv-muted">
              {search || activeTab !== 'all'
                ? 'Nothing matches the current search or tab. Clear search or choose All.'
                : 'No clients in this tenant yet. Register a borrower before creating a loan.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {(search || activeTab !== 'all') && (
                <button type="button" onClick={() => { setSearch(''); setActiveTab('all'); }}
                  className="text-sm border border-bv-border px-3 py-1.5 rounded-bv hover:bg-bv-hover text-bv-muted">
                  Clear filters
                </button>
              )}
              <button type="button" onClick={() => router.push('/dashboard/clients/create')}
                className="text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded-bv hover:bg-bv-action-hover">
                Register client
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bv-hover border-b border-bv-border">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-bv-muted">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-bv-muted hidden md:table-cell">Phone</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-bv-muted hidden lg:table-cell">NIN</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-bv-muted hidden lg:table-cell">KYC</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-bv-muted">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-bv-muted hidden md:table-cell">Created</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-bv-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const kycStatus = getKYCStatus(client);
                const KYCIcon = kycStatus.icon;
                const progress = getKYCProgress(client);

                return (
                  <tr key={client.id} className="hover:bg-bv-hover border-t border-bv-border">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-bv-hover flex items-center justify-center text-xs font-semibold text-bv-muted flex-shrink-0">
                          {client.first_name?.[0]}{client.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-bv-text">{client.first_name} {client.last_name}</p>
                          <p className="text-xs text-bv-meta">{client.occupation || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-bv-muted hidden md:table-cell tabular-nums">
                      {client.phone || '—'}
                    </td>
                    <td className="px-3 py-2 text-bv-muted font-mono text-xs hidden lg:table-cell">
                      {client.nin || '—'}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${kycStatus.cls}`}>
                          <KYCIcon className="h-3 w-3" />
                          {kycStatus.text}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 bg-bv-border rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                progress >= 90 ? 'bg-bv-success' :
                                progress >= 50 ? 'bg-bv-warning' : 'bg-bv-danger'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-bv-meta">{progress}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                        client.status === 'active'
                          ? 'bg-bv-success-bg text-bv-success'
                          : 'bg-bv-hover text-bv-muted'
                      }`}>
                        {client.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-bv-meta text-xs hidden md:table-cell">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                          title="View"
                          className="p-1.5 rounded hover:bg-bv-hover text-bv-meta"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                            title="Edit"
                            className="p-1.5 rounded hover:bg-bv-hover text-bv-meta"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {!isClientKYCComplete(client) && (
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                            title="Complete KYC"
                            className="p-1.5 rounded hover:bg-bv-hover text-bv-meta"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(client.id)}
                            title="Delete"
                            className="p-1.5 rounded hover:bg-bv-danger-bg text-bv-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bv-surface rounded-bv shadow-xl max-w-md w-full border border-bv-border">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-bv-danger-bg rounded-full">
                <AlertCircle className="h-6 w-6 text-bv-danger" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-bv-text">Delete Client</h3>
                <p className="mt-2 text-sm text-bv-muted">
                  Are you sure you want to delete this client? This action cannot be undone.
                </p>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm border border-bv-border rounded-bv hover:bg-bv-hover text-bv-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => { await handleDeleteClient(deleteConfirm); }}
                  className="px-4 py-2 text-sm font-medium rounded-bv bg-bv-danger-bg text-bv-danger border border-bv-danger/30 hover:bg-bv-danger hover:text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
