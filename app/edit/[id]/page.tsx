'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { STORE_TYPES, PRODUCT_CATEGORIES } from '@/lib/categories';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useRefreshData } from '@/lib/useRefreshData';
import { DeleteDialog } from '@/components/DeleteDialog';

export default function EditReceipt({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAppStore();
  const router = useRouter();
  const { triggerRefresh } = useRefreshData();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const resolvedParams = use(params);

  useEffect(() => {
    if (resolvedParams.id && user) {
      loadData(resolvedParams.id);
    }
  }, [resolvedParams.id, user]);

  const loadData = async (id: string) => {
    if (!user) return;
    
    try {
      const { data: receipt, error: rError } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      
      if (rError) throw rError;

      const { data: items, error: iError } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', id);
      
      if (iError) throw iError;

      setFormData({ 
        ...receipt, 
        items: items || [] 
      });
    } catch (e) {
      console.error(e);
      toast.error('Struk tidak ditemukan');
      router.push('/history');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (items: any[]) => items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const addItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      items: [...prev.items, {
        id: uuidv4(),
        item_name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        category: 'lainnya'
      }]
    }));
  };

  const removeItem = (itemId: string) => {
    setFormData((prev: any) => {
      const updatedItems = prev.items.filter((i: any) => i.id !== itemId);
      return {
        ...prev,
        items: updatedItems,
        total_amount: calculateTotal(updatedItems)
      };
    });
  };

  const updateItem = (itemId: string, field: string, value: any) => {
    setFormData((prev: any) => {
      const updatedItems = prev.items.map((i: any) => {
        if (i.id === itemId) {
          const updated = { ...i, [field]: value };
          if (field === 'quantity' || field === 'unit_price') {
            updated.total_price = updated.quantity * updated.unit_price;
          }
          return updated;
        }
        return i;
      });
      return {
        ...prev,
        items: updatedItems,
        total_amount: calculateTotal(updatedItems)
      };
    });
  };

  const saveChanges = async () => {
    if (!user) {
      toast.error('User tidak terautentikasi');
      return;
    }
    
    setSaving(true);
    try {
      const id = resolvedParams.id;
      
      if (!id) throw new Error('ID tidak ditemukan');

      const { items, ...receiptData } = formData;
      
      // Update receipt
      const { error: receiptError } = await supabase
        .from('receipts')
        .update({
          store_name: receiptData.store_name,
          store_type: receiptData.store_type,
          purchase_date: receiptData.purchase_date,
          total_amount: receiptData.total_amount,
          notes: receiptData.notes
        })
        .eq('id', id);

      if (receiptError) throw receiptError;

      // Update or insert items
      for (const item of items) {
        const isExistingItem = item.receipt_id === id || (item.created_at !== undefined);
        
        if (isExistingItem) {
          // Update existing item
          await supabase.from('receipt_items').update({
            item_name: item.item_name,
            item_name_normalized: item.item_name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category: item.category
          }).eq('id', item.id);
        } else {
          // Insert new item
          await supabase.from('receipt_items').insert({
            id: uuidv4(),
            receipt_id: id,
            item_name: item.item_name,
            item_name_normalized: item.item_name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category: item.category
          });
        }
      }
      
      toast.success('Berhasil disimpan!');
      triggerRefresh();
      router.push('/history');
    } catch (e: any) {
      console.error(e);
      toast.error('Gagal menyimpan: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteReceipt = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user) {
      toast.error('User tidak terautentikasi');
      return;
    }
    
    setIsDeleting(true);
    try {
      const id = resolvedParams.id;
      
      if (!id) throw new Error('ID tidak ditemukan');
      
      await supabase.from('receipt_items').delete().eq('receipt_id', id);
      await supabase.from('receipts').delete().eq('id', id);
      
      toast.success('Transaksi dihapus');
      triggerRefresh();
      router.push('/history');
    } catch (e: any) {
      console.error(e);
      toast.error('Gagal menghapus: ' + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !formData) return <div className="p-8 text-center">Memuat...</div>;
  if (!formData) return null;

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold text-plum">Edit Transaksi</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={deleteReceipt} className="text-destructive">
          <Trash2 size={20} />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-plum">Informasi Toko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Toko</Label>
            <Input 
              value={formData.store_name} 
              onChange={e => setFormData({...formData, store_name: e.target.value})} 
              placeholder="Indomaret, SPBU, dll" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipe Toko</Label>
              <Select value={formData.store_type || 'lainnya'} onValueChange={v => setFormData({...formData, store_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STORE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input 
                type="date" 
                value={formData.purchase_date || ''} 
                onChange={e => setFormData({...formData, purchase_date: e.target.value})} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base text-plum">Daftar Barang</CardTitle>
          <Button 
            size="sm" 
            onClick={addItem}
            className="gap-1 h-8"
          >
            <Plus size={16} /> Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {formData.items.length === 0 ? (
            <div className="p-4 text-center text-plum-muted text-sm">
              Belum ada barang. Klik "Tambah" untuk menambahkan barang.
            </div>
          ) : (
            formData.items.map((item: any) => (
              <div key={item.id} className="p-4 border-b border-border space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <Input 
                      value={item.item_name} 
                      onChange={e => updateItem(item.id, 'item_name', e.target.value)} 
                      placeholder="Nama Barang"
                      className="font-medium"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input 
                      type="number" 
                      value={item.quantity} 
                      onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Harga Satuan</Label>
                    <Input 
                      type="number" 
                      value={item.unit_price} 
                      onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))} 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-plum-muted">Total: {formatCurrency(item.quantity * item.unit_price)}</span>
                  <Select value={item.category || 'lainnya'} onValueChange={v => updateItem(item.id, 'category', v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label htmlFor="notes">Catatan (Opsional)</Label>
          <Textarea
            id="notes"
            placeholder="Tambahkan catatan tentang transaksi ini..."
            value={formData.notes || ''}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
        </CardContent>
      </Card>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-border z-40 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-plum">Total Transaksi</span>
          <span className="font-bold text-lg text-primary">{formatCurrency(formData.total_amount)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>Kembali</Button>
          <Button className="flex-[2] bg-primary" onClick={saveChanges} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Editan'}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={formData ? `${formData.store_name} - ${formatCurrency(formData.total_amount)}` : undefined}
        isDeleting={isDeleting}
      />
    </div>
  );
}
