'use client';

import React, { useState } from 'react';
import { useCollection } from '@/hooks/useSyncData';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { createOrUpdateDoc, deleteDocWithSync } from '@/lib/sync-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Upload, FileText, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

export function ExpensesTab() {
  const { formatCurrency, currency } = useCurrency();
  const { data: expenses, isLoading, mutate } = useCollection('expenses');
  const { data: projects } = useCollection('projects');
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    category: 'materials',
    description: '',
    amount: '',
    currency: 'LRD',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: '',
    receiptUrl: '',
  });

  const handleOpen = (expense?: any) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData({
        projectId: expense.projectId || '',
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        currency: expense.currency || 'LRD',
        vendor: expense.vendor || '',
        date: new Date(expense.date).toISOString().split('T')[0],
        status: expense.status,
        notes: expense.notes || '',
        receiptUrl: expense.receiptUrl || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        projectId: '',
        category: 'materials',
        description: '',
        amount: '',
        currency: 'LRD',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: '',
        receiptUrl: '',
      });
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.amount) {
      toast.error('Description and amount are required');
      return;
    }

    try {
      const expenseId = editingId || `exp_${Date.now()}`;
      const data = {
        projectId: formData.projectId,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        vendor: formData.vendor,
        date: new Date(formData.date).getTime(),
        status: formData.status,
        notes: formData.notes,
        receiptUrl: formData.receiptUrl,
      };

      await createOrUpdateDoc('expenses', expenseId, data, user!.id, !!editingId);
      mutate();
      setOpen(false);
      toast.success(editingId ? 'Expense updated' : 'Expense created');
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteDocWithSync('expenses', id, user!.id);
      mutate();
      toast.success('Expense deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const filtered = (expenses || []).filter((e: any) => {
    const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
    const matchesProject = filterProject === 'all' || e.projectId === filterProject;
    const matchesSearch = (e.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (e.category?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (e.vendor?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesCategory && matchesProject && matchesSearch;
  });

  const calculateTotals = () => {
    const totals: Record<string, number> = {};
    filtered.forEach((e: any) => {
      const curr = e.currency || 'LRD';
      totals[curr] = (totals[curr] || 0) + (Number(e.amount) || 0);
    });
    return totals;
  };

  const totals = calculateTotals();
  const mainTotal = totals[currency] || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Expenses</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <p className="text-sm font-semibold text-blue-600">Total ({currency}): {formatCurrency(mainTotal)}</p>
            {Object.entries(totals).map(([curr, amt]) => curr !== currency && (
              <p key={curr} className="text-sm text-muted-foreground">Total ({curr}): {amt.toLocaleString()}</p>
            ))}
          </div>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpen()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Expense' : 'New Expense'}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Project (Optional)</label>
                  <Select value={formData.projectId} onValueChange={(val) => setFormData({ ...formData, projectId: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Project</SelectItem>
                      {projects?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materials">Materials</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Expense description" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LRD">LRD (Liberian Dollar)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Vendor (Optional)</label>
                  <Input value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder="Vendor name" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="text-sm font-medium">Date</label>
                    <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                   <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Receipt URL (Optional)</label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.receiptUrl} 
                      onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })} 
                      placeholder="https://..." 
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => toast.info('File upload simulator: Link generated locally.')}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 mx-1">Only administrators can upload and manage receipts.</p>
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? 'Update' : 'Create'} Expense
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

       {/* Filters */}
       <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input 
            placeholder="Search expenses by description, vendor or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
         <Select value={filterCategory} onValueChange={setFilterCategory}>
           <SelectTrigger className="w-full sm:w-[200px]">
             <SelectValue placeholder="All Categories" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Categories</SelectItem>
             <SelectItem value="materials">Materials</SelectItem>
             <SelectItem value="labor">Labor</SelectItem>
             <SelectItem value="equipment">Equipment</SelectItem>
             <SelectItem value="other">Other</SelectItem>
           </SelectContent>
         </Select>
         <Select value={filterProject} onValueChange={setFilterProject}>
           <SelectTrigger className="w-full sm:w-[200px]">
             <SelectValue placeholder="All Projects" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Projects</SelectItem>
             {projects?.map((p: any) => (
               <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>

      {/* Expenses Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="w-8 h-8" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No expenses found</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Description</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exp: any) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium text-sm">{exp.description}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs">{exp.category}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(exp.amount || 0)}
                    <span className="text-[10px] ml-1 text-muted-foreground">{exp.currency || 'LRD'}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{new Date(exp.date).toLocaleDateString()}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                      {exp.receiptUrl && (
                        <Button variant="ghost" size="icon" onClick={() => window.open(exp.receiptUrl, '_blank')} className="h-8 w-8 text-emerald-500">
                          <FileText className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(exp)} className="h-8 w-8">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
