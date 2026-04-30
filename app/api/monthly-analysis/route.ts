/**
 * Next.js API Route
 * Monthly Analysis using Groq AI and Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'your-groq-api-key',
});

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { userId, month } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Default to current month if not provided
    const analysisMonth = month || new Date().toISOString().slice(0, 7);
    const supabase = getSupabase();

    // Fetch receipts for the month
    const startDate = `${analysisMonth}-01`;
    // Get the last day of the month to handle different month lengths
    const [year, monthNum] = analysisMonth.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate(); // monthNum is 1-based, so monthNum+1 gives next month, day 0 gives last day of current month
    const endDate = `${analysisMonth}-${lastDay.toString().padStart(2, '0')}`;

    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select(`
        *,
        items:receipt_items(*)
      `)
      .eq('user_id', userId)
      .gte('purchase_date', startDate)
      .lte('purchase_date', endDate)
      .order('purchase_date', { ascending: false });

    if (receiptsError) {
      console.error('Error fetching receipts:', receiptsError);
      return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
    }

    // Calculate total spending and categories
    let totalSpending = 0;
    const categories: Record<string, number> = {};
    const itemsSummary: string[] = [];

    receipts?.forEach(receipt => {
      totalSpending += receipt.total_amount || 0;
      
      receipt.items?.forEach((item: any) => {
        const category = item.category || 'Lainnya';
        categories[category] = (categories[category] || 0) + (item.total_price || 0);
        itemsSummary.push(`${item.item_name} (${item.quantity}x)`);
      });
    });

    console.log('Total spending:', totalSpending);
    console.log('Categories:', categories);

    // Generate AI analysis
    const analysisPrompt = `Analisis pengeluaran bulanan untuk bulan ${analysisMonth}:

Total Pengeluaran: Rp ${totalSpending.toLocaleString('id-ID')}
Kategori Pengeluaran:
${Object.entries(categories).map(([cat, amount]) => `- ${cat}: Rp ${amount.toLocaleString('id-ID')}`).join('\n')}

Item-item yang dibeli:
${itemsSummary.slice(0, 20).join('\n')}

Beri analisis singkat dalam bahasa Indonesia tentang:
1. Pola pengeluaran
2. Kategori yang mendominasi
3. Saran untuk penghematan
4. Insight menarik lainnya

Jawab dalam format yang mudah dibaca dengan emoji yang sesuai.`;

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah ahli keuangan yang membantu menganalisis pengeluaran bulanan. Berikan analisis yang singkat, jelas, dan actionable dalam bahasa Indonesia.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const analysis = message.choices[0]?.message?.content || 'Tidak dapat生成 analisis.';

    const result = {
      month: analysisMonth,
      total_spending: totalSpending,
      categories,
      items_summary: itemsSummary.slice(0, 10).join(', '),
      analysis,
    };

    console.log('Analysis result:', result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in monthly analysis:', error);
    return NextResponse.json({
      error: 'Failed to generate monthly analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
