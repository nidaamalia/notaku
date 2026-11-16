/**
 * Next.js API Route
 * Process Receipt Text using Groq AI
 */

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { SYSTEM_PROMPT } from '@/lib/categories';
import { validateReceiptInput } from '@/lib/receipt-input';

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const input = validateReceiptInput(body);
    if (!input.ok) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }
    const { text } = input;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Receipt processing is not configured' }, { status: 503 });
    }
    const groq = new Groq({ apiKey });

    const systemPrompt = SYSTEM_PROMPT;

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Teks struk:\n${text}`,
        },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2048,
    });

    const responseText = message.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json({ error: 'No response from Groq' }, { status: 500 });
    }

    let parsedData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Groq response:', responseText);
      return NextResponse.json({
        error: 'Failed to parse receipt data',
        details: responseText,
      }, { status: 500 });
    }

    const validatedData = {
      store_name: parsedData.merchant_name || '',
      store_type: parsedData.store_type || 'lainnya',
      purchase_date: parsedData.date || new Date().toISOString().split('T')[0],
      total_amount: parsedData.total_amount || 0,
      is_manual: false,
      notes: parsedData.discount ? `Diskon: ${parsedData.discount}` : '',
      items: (parsedData.items || []).map((item: any, index: number) => ({
        id: `item_${Date.now()}_${index}`,
        item_name: item.name || '',
        quantity: item.qty || 1,
        unit_price: item.price || 0,
        total_price: item.total || 0,
        category: item.category || 'lainnya',
      })),
    };

    return NextResponse.json({
      success: true,
      data: validatedData,
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    return NextResponse.json({
      error: 'Failed to process receipt',
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
