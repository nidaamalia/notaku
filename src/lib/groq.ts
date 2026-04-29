/**
 * Groq Text Processing API Client
 * Calls the backend API to process receipt text using Groq
 */

export interface ReceiptItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
}

export interface ProcessedReceiptData {
  store_name: string;
  store_type: string;
  purchase_date: string;
  total_amount: number;
  is_manual: boolean;
  notes: string;
  items: ReceiptItem[];
}

export interface MonthlyAnalysisData {
  month: string;
  total_spending: number;
  categories: Record<string, number>;
  items_summary: string;
  analysis: string;
}

export interface MonthlyAnalysisResponse {
  success: boolean;
  data?: MonthlyAnalysisData;
  error?: string;
}

export async function processReceiptText(
  text: string
): Promise<ProcessedReceiptData> {
  try {
    const response = await fetch('/api/process-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.details || errorData.error || 'Failed to process receipt'
      );
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid response format from server');
    }

    return result.data as ProcessedReceiptData;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error occurred while processing receipt');
  }
}

/**
 * Mengambil analisis pengeluaran bulanan dari Groq
 * @param userId - ID pengguna
 * @param month - Bulan dalam format YYYY-MM (opsional, default bulan berjalan)
 */
export async function getMonthlyAnalysis(
  userId: string,
  month?: string
): Promise<MonthlyAnalysisData> {
  try {
    const response = await fetch('/api/monthly-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, month }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to get monthly analysis' };
      }
      throw new Error(
        errorData.details || errorData.error || `Failed to get monthly analysis (${response.status})`
      );
    }

    const responseText = await response.text();
    let result: MonthlyAnalysisResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid JSON response from server');
    }
    
    if (!result.success || !result.data) {
      throw new Error('Invalid response format from server');
    }

    return result.data as MonthlyAnalysisData;
  } catch (error) {
    console.error('Error calling monthly analysis API:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error occurred while fetching monthly analysis');
  }
}
