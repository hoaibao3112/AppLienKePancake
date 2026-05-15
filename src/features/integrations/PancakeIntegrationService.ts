import { supabase } from '../../config/supabase';

export interface PancakeLeadPayload {
  name: string;
  phone: string;
  email: string;
  interested_course?: string;
  source: 'pancake_facebook' | 'pancake_zalo';
  pancake_id: string; // ID from Pancake CRM
}

class PancakeIntegrationService {
  /**
   * Synchronizes a lead from Pancake CRM webhook to our local database
   */
  async syncLeadToPancake(payload: PancakeLeadPayload) {
    try {
      console.log('System Log: Lead Synced From Pancake', payload);

      // 1. Check if customer already exists by email or phone
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .or(`email.eq.${payload.email},phone.eq.${payload.phone}`)
        .single();

      let customerId;

      if (existingCustomer) {
        // Update existing customer source if it was website (upgrade to pancake)
        const { data, error } = await supabase
          .from('customers')
          .update({
            source: payload.source,
            last_activity: new Date().toISOString()
          })
          .eq('id', existingCustomer.id)
          .select()
          .single();

        if (error) throw error;
        customerId = data.id;
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert({
            full_name: payload.name,
            email: payload.email,
            phone: payload.phone,
            source: payload.source,
            lead_status: 'NEW'
          })
          .select()
          .single();

        if (error) throw error;
        customerId = data.id;
      }

      // 2. Add an activity log
      await this.logActivity(customerId, 'LEAD_SYNCED', 'Lead synced from Pancake', {
        source: payload.source,
        pancake_id: payload.pancake_id,
        interested_course: payload.interested_course
      });

      return { success: true, customerId };

    } catch (error) {
      console.error('Error syncing lead from Pancake:', error);
      return { success: false, error };
    }
  }

  /**
   * Tracks customer source explicitly 
   */
  async syncCustomerSource(customerId: string, source: string) {
    return supabase
      .from('customers')
      .update({ source })
      .eq('id', customerId);
  }

  /**
   * Pushes a local lead back to Pancake if needed
   */
  async trackPancakeLead(customerId: string) {
    // In production, this would make an HTTP request to Pancake API
    console.log(`System Log: Simulating Push Lead ${customerId} To Pancake CRM API`);
    // Example:
    // await axios.post('https://pages.fm/api/v1/workspaces/xxx/customers', { ... })
    return { success: true, message: 'Lead pushed to Pancake' };
  }

  private async logActivity(customerId: string, type: string, description: string, metadata: any = {}) {
    await supabase.from('customer_activities').insert({
      customer_id: customerId,
      activity_type: type,
      description,
      metadata
    });
  }
}

export const pancakeService = new PancakeIntegrationService();
