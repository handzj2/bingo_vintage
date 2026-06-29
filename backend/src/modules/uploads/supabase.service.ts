// STATUS (engineering decision, retained intentionally — not dead code):
// This service is not currently registered in any NestJS module, has no
// controller, and is not injected anywhere. It was built to support KYC
// document upload (uploadDocument/deleteDocument against a Supabase storage
// bucket), but the frontend was never given a corresponding upload UI —
// confirmed by exhaustive search: no file-input element exists on the client
// registration form, and no document-upload UI exists anywhere in the
// frontend.
//
// Decision: keep for future use rather than remove. When document upload is
// prioritized, this service is ready to wire in — it needs: (1) a module file
// registering it as a provider, (2) a controller exposing its two methods
// (likely under POST /clients/:id/documents), (3) SUPABASE_URL/SUPABASE_KEY
// environment variables confirmed present in the deployment environment,
// (4) a file-input UI added to ClientForm.tsx or a dedicated documents page.
// Do not delete this file in a future dead-code pass without re-confirming
// this decision still holds.
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // Service role key (keep secret!)
    );
  }

  async uploadDocument(file: Buffer, filename: string, clientId: string) {
    const path = `${clientId}/${Date.now()}-${filename}`;
    
    const { data, error } = await this.client.storage
      .from('kyc-documents')
      .upload(path, file, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = this.client.storage
      .from('kyc-documents')
      .getPublicUrl(path);

    return {
      path,
      url: publicUrl,
      bucket: 'kyc-documents'
    };
  }

  async deleteDocument(path: string) {
    const { error } = await this.client.storage
      .from('kyc-documents')
      .remove([path]);
    
    if (error) throw error;
  }
}