import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get all receipts with items (for debugging)
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('*, items:receipt_items(*)')
      .order('purchase_date', { ascending: false })
      .limit(10);

    if (receiptsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch receipts', 
        details: receiptsError 
      }, { status: 500 });
    }

    // Format data for easier debugging
    const formattedReceipts = receipts?.map(r => ({
      id: r.id,
      store_name: r.store_name,
      purchase_date: r.purchase_date,
      total_amount: r.total_amount,
      is_manual: r.is_manual,
      items_count: r.items?.length || 0,
      created_at: r.created_at
    })) || [];

    return NextResponse.json({
      receipts: formattedReceipts,
      totalReceipts: formattedReceipts.length,
      timestamp: new Date().toISOString(),
      note: "Data diurutkan berdasarkan purchase_date (terbaru dulu)"
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { receiptId } = await request.json();
    
    if (!receiptId) {
      return NextResponse.json({ error: 'Receipt ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Delete items first
    const { error: itemsError } = await supabase
      .from('receipt_items')
      .delete()
      .eq('receipt_id', receiptId);

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to delete items', details: itemsError }, { status: 500 });
    }

    // Delete receipt
    const { error: receiptError } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId);

    if (receiptError) {
      return NextResponse.json({ error: 'Failed to delete receipt', details: receiptError }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Receipt deleted successfully',
      deletedReceiptId: receiptId
    });

  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
