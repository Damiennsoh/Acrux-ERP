'use client';

import React, { useState } from 'react';
import { useCollection } from '@/hooks/useSyncData';
import { useAuth } from '@/lib/auth-context';
import { slugifyOrg } from '@/lib/utils/org';
import { formatDate, toISODate } from '@/lib/utils/date';
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
import { Plus, Trash2, Edit2, FileText } from 'lucide-react';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import { toast } from 'sonner';

export function MiscellaneousTab() {
  const { formatCurrency, currency } = useCurrency();
  const { data: miscellaneous, isLoading, mutate } = useCollection('miscellaneous');
  const { data: projects } = useCollection('projects');
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    date: toISODate(null),
    description: '',
    category: 'Office Supplies',
    amount: '',
    currency: 'USD',
    receiptUrl: '',
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        projectId: item.projectId,
        date: item.date || toISODate(null),
        description: item.description,
        category: item.category || 'Office Supplies',
        amount: item.amount.toString(),
        currency: item.currency || 'USD',
        receiptUrl: item.receiptUrl || '',
      });
      const defaultCats = ['Office Supplies', 'Travel', 'Meals', 'Training & Education', 'Misc'];
      const isCustom = item.category && !defaultCats.includes(item.category);
      if (isCustom) {
        setFormData(prev => ({ ...prev, category: 'Add +' }));
        setIsCustomCategory(true);
        setCustomCategory(item.category);
      } else {
        setIsCustomCategory(false);
        setCustomCategory('');
      }
    } else {
      setEditingId(null);
      setFormData({
        projectId: '',
        date: toISODate(null),
        description: '',
        category: 'Office Supplies',
        amount: '',
        currency: 'USD',
        receiptUrl: '',
      });
    }
    setIsCustomCategory(false);
    setCustomCategory('');
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId || !formData.description || !formData.amount) {
      toast.error('Project, description, and amount are required');
      return;
    }

    try {
      const docId = editingId || `misc_${Date.now()}`;
      const data = {
        projectId: formData.projectId,
        date: formData.date,
        description: formData.description,
        category: isCustomCategory ? customCategory : formData.category,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        receiptUrl: formData.receiptUrl,
        orgId: slugifyOrg(user!.organizationName),
      };

      await createOrUpdateDoc('miscellaneous', docId, data, user!.id, !!editingId);
      mutate();
      setOpen(false);
      toast.success(editingId ? 'Miscellaneous expense updated' : 'Miscellaneous expense added');
    } catch (error) {
      toast.error('Failed to save miscellaneous expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this miscellaneous record?')) return;
    try {
      await deleteDocWithSync('miscellaneous', id, user!.id);
      mutate();
      toast.success('Miscellaneous record deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const filtered = (miscellaneous || []).filter((p: any) => {
    const matchesProject = filterProject === 'all' || p.projectId === filterProject;
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesSearch = (p.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (p.category?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (p.projectId?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesProject && matchesCategory && matchesSearch;
  });

  const calculateTotals = () => {
    const totals: Record<string, number> = {};
    filtered.forEach((p: any) => {
      const curr = p.currency || 'USD';
      totals[curr] = (totals[curr] || 0) + (Number(p.amount) || 0);
    });
    return totals;
  };

  const totals = calculateTotals();
  const mainTotal = totals[currency] || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Miscellaneous</h2>
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
              <Button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Miscellaneous' : 'New Miscellaneous Record'}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Project</label>
                  <Select value={formData.projectId} onValueChange={(val) => setFormData({ ...formData, projectId: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((p: any) => (
                        <SelectItem key={p.id} value={p.projectId || p.id}>{p.projectName || p.name || p.projectId}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. Office supplies" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                     <Select 
                      value={formData.category} 
                      onValueChange={(val) => {
                        setFormData({ ...formData, category: val });
                        if (val !== 'Add +') {
                          setIsCustomCategory(false);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Meals">Meals</SelectItem>
                        <SelectItem value="Training & Education">Training & Education</SelectItem>
                        <SelectItem value="Misc">Misc</SelectItem>
                         <SelectItem value="Add +">Add + Custom</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   {formData.category === 'Add +' && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Custom Category</label>
                      <Input
                        value={customCategory}
                        onChange={(e) => {
                          setCustomCategory(e.target.value);
                          setIsCustomCategory(true);
                        }}
                        placeholder="Enter custom category"
                      />
                    </div>
                  )}
                   <div>
                    <label className="text-sm font-medium">Date</label>
                    <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                        <SelectItem value="GHS">GHS (Ghanaian Cedi)</SelectItem>
                        <SelectItem value="ZWL">ZWL (Zimbabwean Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Receipt / Proof</label>
                  <ImageUploadButton 
                    value={formData.receiptUrl} 
                    onChange={(url) => setFormData({ ...formData, receiptUrl: url })} 
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  {editingId ? 'Update' : 'Save'} Record
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
            placeholder="Search by description, category or project ID..." 
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
             <SelectItem value="Office Supplies">Office Supplies</SelectItem>
             <SelectItem value="Travel">Travel</SelectItem>
             <SelectItem value="Meals">Meals</SelectItem>
             <SelectItem value="Training & Education">Training & Education</SelectItem>
             <SelectItem value="Misc">Misc</SelectItem>
           </SelectContent>
         </Select>
         <Select value={filterProject} onValueChange={setFilterProject}>
           <SelectTrigger className="w-full sm:w-[250px]">
             <SelectValue placeholder="Filter by Project" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Projects</SelectItem>
             {projects?.map((p: any) => (
               <SelectItem key={p.id} value={p.projectId || p.id}>{p.projectName || p.name || p.projectId}</SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="w-8 h-8" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No miscellaneous records found</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Project ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right font-bold">Amount</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.projectId}</TableCell>
                  <TableCell className="font-medium text-sm">{item.description}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{item.category}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{item.date}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.amount || 0)}
                    <span className="text-[10px] ml-1 text-muted-foreground">{item.currency || 'USD'}</span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                      {item.receiptUrl && (
                        <Button variant="ghost" size="icon" onClick={() => window.open(item.receiptUrl, '_blank')} className="h-8 w-8 text-blue-600">
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(item)} className="h-8 w-8">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
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
