/**
 * Next.js API Route
 * Process Receipt Text using Groq AI
 */

import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { SYSTEM_PROMPT } from '../../src/lib/categories';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

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
      return res.status(500).json({ error: 'No response from Groq' });
    }

    let parsedData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Groq response:', responseText);
      return res.status(500).json({
        error: 'Failed to parse receipt data',
        details: responseText,
      });
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

    return res.json({
      success: true,
      data: validatedData,
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    return res.status(500).json({
      error: 'Failed to process receipt',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
