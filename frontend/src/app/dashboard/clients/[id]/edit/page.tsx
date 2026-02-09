'use client';

import { useRouter } from 'next/navigation';
import { ClientForm } from '@/features/clients/ClientForm';
import { getClientById, updateClient } from '@/features/clients/client.api';
import { useEffect, useState } from 'react';
import { Client } from '@/features/clients/client.types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function EditClientPage({ params }: any) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadClient();
  }, [params.id]);

  const loadClient = async () => {
    try {
      setIsLoading(true);
      const data = await getClientById(params.id);
      setClient(data);
    } catch (error) {
      toast.error('Failed to load client');
      router.push('/dashboard/clients');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- LOADING STATE ----------
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading client data...</span>
      </div>
    );
  }

  // ---------- NOT FOUND ----------
  if (!client) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Client Not Found</h1>
        <p className="text-gray-600 mb-4">
          The client you are trying to edit does not exist or could not be loaded.
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ---------- PAGE RENDER ----------
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Client Profile
          </h1>
          <p className="text-gray-600">
            Update information for {client.full_name || 'this client'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Client ID: {client.id}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <ClientForm
            mode="edit"
            initialData={client}
            onSubmit={async data => {
              try {
                await updateClient(params.id, data);
                toast.success('Client updated successfully');
                router.push(`/dashboard/clients/${params.id}`);
              } catch (error) {
                toast.error('Failed to update client');
                throw error;
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}