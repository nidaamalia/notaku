export interface Profile {
  id: string;
  family_name: string;
  monthly_income: number;
  saving_target_pct: number;
  created_at: string;
}

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
  updated_at: string;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  item_name: string;
  item_name_normalized: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
  updated_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  month: string;
  source: string;
  amount: number;
}

export interface Saving {
  id: string;
  user_id: string;
  month: string;
  amount: number;
  notes?: string;
}

export interface MonthlyInsight {
  id: string;
  user_id: string;
  month: string;
  insight_md: string;
  generated_at: string;
}
