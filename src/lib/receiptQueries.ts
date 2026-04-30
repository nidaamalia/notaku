import { supabase } from './supabase';

export interface Receipt {
  id: string;
  user_id: string;
  store_name: string;
  store_type: string;
  purchase_date: string;
  total_amount: number;
  is_manual: boolean;
  notes?: string;
  created_at: string;
  items?: any[];
}

export async function fetchRecentReceipts(userId: string, limit: number = 5) {
  console.log('🔍 QUERY - Fetching recent receipts:', { userId, limit });
  
  // Check if we're in mock mode
  if (!userId || userId === 'mock-user-id') {
    console.log('🔍 QUERY - Mock mode detected, returning empty receipts');
    return [];
  }
  
  const { data, error } = await supabase
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .eq('user_id', userId)
    .order('purchase_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ QUERY - Error fetching recent receipts:', error);
    // In mock mode, don't throw errors, just return empty data
    if (error.message && error.message.includes('Mock mode')) {
      console.log('🔍 QUERY - Mock mode error, returning empty receipts');
      return [];
    }
    throw error;
  }

  console.log('✅ QUERY - Recent receipts fetched:', {
    count: data?.length || 0,
    userId,
    limit
  });

  return data || [];
}

export async function fetchAllReceipts(userId: string) {
  console.log('🔍 QUERY - Fetching all receipts:', { userId });
  
  // Check if we're in mock mode
  if (!userId || userId === 'mock-user-id') {
    console.log('🔍 QUERY - Mock mode detected, returning empty receipts');
    return [];
  }
  
  const { data, error } = await supabase
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .eq('user_id', userId)
    .order('purchase_date', { ascending: false });

  if (error) {
    console.error('❌ QUERY - Error fetching all receipts:', error);
    // In mock mode, don't throw errors, just return empty data
    if (error.message && error.message.includes('Mock mode')) {
      console.log('🔍 QUERY - Mock mode error, returning empty receipts');
      return [];
    }
    throw error;
  }

  console.log('✅ QUERY - All receipts fetched:', {
    count: data?.length || 0,
    userId
  });

  return data || [];
}
