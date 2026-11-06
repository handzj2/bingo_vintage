// v2 - fixed ClientFormProps
'use client';

import { useRouter } from 'next/navigation';
import ClientForm from '@/features/clients/ClientForm';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CreateClientPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-2xl p-4 sm:p-6 mx-auto">
      <div className="border-b border-bv-border pb-4">
        <p className="text-xs text-bv-meta mb-1">
          <Link href="/dashboard/clients" className="hover:underline">Clients</Link>
          {' / '}Register
        </p>
        <h1 className="text-lg font-semibold text-bv-text">Register client</h1>
        <p className="text-sm text-bv-muted mt-0.5">
          Capture borrower identity and contact details before creating a loan. Required fields must be complete for KYC progress.
        </p>
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
