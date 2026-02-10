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
import { Button } from '@/components/ui/Button';
import { input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type { Client } from '@/features/clients/client.types';

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
  // Format address as a string if we have city or state
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
    marital_status: dbClient.maritalStatus,
    address: address,
    city: dbClient.city,
    state: dbClient.state,
    country: dbClient.country,
    postal_code: dbClient.postalCode,
    occupation: dbClient.occupation,
    employment_status: dbClient.employmentStatus,
    monthly_income: dbClient.monthlyIncome ? parseFloat(dbClient.monthlyIncome) : undefined,
    tax_id: undefined,
    bank_name: dbClient.bankName,
    account_number: dbClient.accountNumber,
    bank_branch: dbClient.bankBranch,
    next_of_kin_name: dbClient.nextOfKinName || '',
    next_of_kin_phone: dbClient.nextOfKinPhone || '',
    next_of_kin_relationship: dbClient.nextOfKinRelationship,
    business_name: dbClient.businessName,
    business_type: dbClient.businessType,
    business_address: dbClient.businessAddress,
    status: dbClient.status || 'active',
    verified: false,
    created_at: dbClient.createdAt || new Date().toISOString(),
    updated_at: dbClient.updatedAt || new Date().toISOString(),
    // Optional fields from Client type
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
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'kyc_complete' | 'kyc_incomplete'>('all');

  // Fetch clients from real API
  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [search, clients, activeTab]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients') as { success: boolean; data?: DBClient[]; message?: string };
      
      if (response.success && response.data) {
        const formattedClients = response.data.map(apiClientToClient);
        setClients(formattedClients);
        setFilteredClients(formattedClients);
      } else {
        throw new Error(response.message || 'Failed to fetch clients');
      }
    } catch (error: any) {
      console.error('Failed to fetch clients:', error);
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
      // Check if api has a delete method, if not use post or patch with delete action
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

  // KYC Progress Calculation - Updated to match new Client type structure
  const getKYCProgress = (client: Client): number => {
    let completedFields = 0;
    let totalFields = 20; // Reduced to match actual required fields
    
    // Core Info (9 required fields)
    const coreFields = [
      client.first_name, client.last_name, client.email, client.phone, client.nin,
      client.date_of_birth, client.gender, client.next_of_kin_name, client.next_of_kin_phone
    ];
    completedFields += coreFields.filter(field => 
      field !== undefined && field !== null && field !== ''
    ).length;
    
    // Address Info (at least some address info)
    const addressFields = [client.address, client.city, client.state, client.country];
    const hasAddress = addressFields.some(field => field && field !== '');
    if (hasAddress) completedFields += 1;
    
    // Employment Info
    if (client.occupation || client.employment_status || client.monthly_income) {
      completedFields += 1;
    }
    
    // Banking Info
    if (client.bank_name || client.account_number) {
      completedFields += 1;
    }
    
    return Math.round((completedFields / totalFields) * 100);
  };

  const getKYCStatus = (client: Client): { text: string; color: string; icon: any; variant: "default" | "secondary" | "destructive" | "outline" } => {
    const progress = getKYCProgress(client);
    
    if (progress >= 90) {
      return { 
        text: 'KYC Complete', 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: ShieldCheck,
        variant: "default" as const
      };
    } else if (progress >= 50) {
      return { 
        text: 'KYC Partial', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Shield,
        variant: "secondary" as const
      };
    } else {
      return { 
        text: 'KYC Incomplete', 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: ShieldAlert,
        variant: "destructive" as const
      };
    }
  };

  const isClientKYCComplete = (client: Client): boolean => {
    return getKYCProgress(client) >= 90;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // KYC Stats
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your borrower database and client information
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/clients/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Client
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-4">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold">
                  {clients.filter(c => c.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg mr-4">
                <Shield className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KYC Complete</p>
                <p className="text-2xl font-bold">{kycStats.complete}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KYC Incomplete</p>
                <p className="text-2xl font-bold">{kycStats.incomplete + kycStats.partial}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-4">
                <ShieldCheck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KYC Avg. Progress</p>
                <p className="text-2xl font-bold">{kycStats.averageProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KYC Progress Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Compliance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">Complete</span>
                <span className="text-lg font-bold text-green-900">{kycStats.complete}</span>
              </div>
              <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${clients.length > 0 ? (kycStats.complete / clients.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-yellow-800">Partial</span>
                <span className="text-lg font-bold text-yellow-900">{kycStats.partial}</span>
              </div>
              <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${clients.length > 0 ? (kycStats.partial / clients.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-800">Incomplete</span>
                <span className="text-lg font-bold text-red-900">{kycStats.incomplete}</span>
              </div>
              <div className="mt-2 w-full bg-red-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ width: `${clients.length > 0 ? (kycStats.incomplete / clients.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">Avg Progress</span>
                <span className="text-lg font-bold text-blue-900">{kycStats.averageProgress}%</span>
              </div>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${kycStats.averageProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search clients by name, email, phone, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-muted-foreground mr-2" />
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="">Sort by: Newest</option>
                  <option value="name">Name A-Z</option>
                  <option value="kyc">KYC Progress</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <div className="overflow-x-auto">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <User className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No clients found</h3>
              <p className="mt-2 text-muted-foreground">
                {search ? 'Try a different search term' : 'Get started by adding your first client'}
              </p>
              {!search && (
                <Button 
                  onClick={() => router.push('/dashboard/clients/create')}
                  className="mt-6"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Client
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Contact Info</TableHead>
                  <TableHead className="hidden lg:table-cell">KYC Status</TableHead>
                  <TableHead className="hidden xl:table-cell">KYC Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const kycStatus = getKYCStatus(client);
                  const KYCStatusIcon = kycStatus.icon;
                  const progress = getKYCProgress(client);
                  
                  return (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                            {client.first_name?.[0]}{client.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium">{client.first_name} {client.last_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {client.occupation || 'No occupation'}
                            </div>
                            {client.address && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {client.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                            {client.phone || 'N/A'}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 mr-2" />
                            {client.email || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={kycStatus.variant} className="flex items-center gap-1 w-fit">
                          <KYCStatusIcon className="h-3 w-3" />
                          {kycStatus.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  progress >= 90 ? 'bg-green-500' :
                                  progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{progress}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {progress >= 90 ? 'Eligible for loans' :
                             progress >= 50 ? 'Needs more info' : 'Complete KYC required'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-2" />
                          {formatDate(client.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!isClientKYCComplete(client) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                              title="Complete KYC"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(client.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-foreground">Delete Client</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Are you sure you want to delete this client? This action cannot be undone.
                </p>
              </div>
              <div className="mt-6 flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await handleDeleteClient(deleteConfirm);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}