// v2 - fixed ClientFormProps
'use client';

import { useRouter } from 'next/navigation';
import ClientForm from '@/features/clients/ClientForm';
import { createClient } from '@/features/clients/client.api';
import { toast } from 'sonner';

export default function CreateClientPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Client</h1>
        <p className="text-muted-foreground">Add a new client to the system</p>
      </div>

      <ClientForm
        onSuccess={() => {
          toast.success('Client created successfully');
          router.push('/dashboard/clients');
        }}
      />
    </div>
  );
}