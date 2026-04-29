/**
 * Next.js API Route
 * Monthly Analysis using Groq AI and Supabase
 */

import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'your-groq-api-key',
});

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== MONTHLY ANALYSIS API START ===');
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request - returning 200');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    console.log('Monthly analysis API called');
    console.log('Environment check:', {
      GROQ_API_KEY: process.env.GROQ_API_KEY ? 'SET' : 'NOT SET',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
    });

    const { userId, month } = req.body;
    console.log('Request body:', { userId, month });

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const currentDate = new Date();
    const targetMonth = month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const [year, monthNum] = targetMonth.split('-');
    const startDate = new Date(`${year}-${monthNum}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const { data: receipts, error: receiptsError } = await getSupabase()
      .from('receipts')
      .select('*, items:receipt_items(*)')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (receiptsError) {
      console.error('Supabase error:', receiptsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch receipts',
      });
    }

    if (!receipts || receipts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          month: targetMonth,
          total_spending: 0,
          categories: {},
          items_summary: 'Tidak ada data pengeluaran untuk bulan ini.',
          analysis: 'Belum ada pengeluaran yang tercatat untuk bulan ini. Mulailah dengan menambahkan struk pembelian Anda.',
        },
      });
    }

    let totalSpending = 0;
    const categorySpending: Record<string, number> = {};
    const allItems: Array<{ name: string; price: number; category: string }> = [];

    for (const receipt of receipts) {
      totalSpending += receipt.total_amount || 0;

      const items = receipt.items || [];
      for (const item of items) {
        const category = item.category || 'Lainnya';
        categorySpending[category] = (categorySpending[category] || 0) + (item.total_price || 0);
        allItems.push({
          name: item.item_name || 'Produk',
          price: item.total_price || 0,
          category: category,
        });
      }
    }

    const itemsSummary = Object.entries(categorySpending)
      .map(([category, amount]) => `${category}: Rp ${amount.toLocaleString('id-ID')}`)
      .join('\n');

    const dataForAnalysis = `
### RINGKASAN BULAN ${targetMonth} ###
Total Spending: Rp ${totalSpending.toLocaleString('id-ID')}

### KATEGORI SPENDING ###
${itemsSummary}

### LOG TRANSAKSI DETAIL (Untuk Analisis Per Item) ###
${allItems.map(item => `- [${item.category}] ${item.name}: Rp ${item.price.toLocaleString('id-ID')}`).join('\n')}
`.trim();

    const FINANCIAL_ANALYSIS_PROMPT = `Anda adalah Expert Financial Auditor & Wealth Advisor. 
Tugas Anda adalah membedah pengeluaran pengguna dengan tajam, jujur, namun memberikan solusi yang membangun.

Gunakan framework 50/30/20 (50% Kebutuhan, 30% Keinginan, 20% Tabungan/Utang) sebagai standar evaluasi.

Struktur Output Harus Mengikuti Format Ini:
1. **Financial Health Score**: Berikan skor 1-10 berdasarkan efisiensi belanja bulan ini.
2. **Top 3 Money Leak**: Sebutkan 3 kategori pengeluaran terbesar dan analisis apakah itu "investasi hidup" atau "pemborosan".
3. **Deep Dive Items**: Cari item spesifik yang tidak perlu atau bisa dicari alternatifnya (misal: kantong plastik, kopi berlebih, atau barang branded yang ada versi ekonomisnya).
4. **Action Plan Bulan Depan**: Berikan 3 langkah konkret yang BISA DILAKUKAN (misal: "Bawa tas belanja sendiri untuk hemat Rp 5.000/minggu").
5. **Burn Rate Prediction**: Jika pola ini bertahan, apa dampaknya bagi keuangan mereka di akhir tahun.

Gaya Bahasa: Profesional, sedikit tegas (untuk mengedukasi), namun tetap empatik. Gunakan Bahasa Indonesia yang natural.`;

    const userPrompt = `Analisis data pengeluaran bulanan saya berikut:

Data Pengeluaran:
${dataForAnalysis}`;

    const analysisResponse = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: FINANCIAL_ANALYSIS_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 2048,
    });

    const analysis = analysisResponse.choices[0]?.message?.content || 'Analisis tidak tersedia';

    console.log('Analysis completed successfully');
    const result = {
      success: true,
      data: {
        month: targetMonth,
        total_spending: totalSpending,
        categories: categorySpending,
        items_summary: itemsSummary,
        analysis: analysis,
      },
    };
    
    console.log('Sending response:', result);
    return res.json(result);
  } catch (error) {
    console.error('Error in monthly analysis:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to analyze monthly spending',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    console.log('Sending error response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
}
