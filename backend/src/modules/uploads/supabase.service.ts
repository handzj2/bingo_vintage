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