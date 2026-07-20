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

export function BrokerTab() {
  const { formatCurrency, currency } = useCurrency();
  const { data: brokers, isLoading, mutate } = useCollection('broker_payments');
  const { data: projects } = useCollection('projects');
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    brokerId: '',
    brokerName: '',
    amount: '',
    currency: 'LRD',
    paymentDate: new Date().toISOString().split('T')[0],
    receiptUrl: '',
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        projectId: item.projectId || '',
        brokerId: item.brokerId || '',
        brokerName: item.brokerName,
        amount: item.amount.toString(),
        currency: item.currency || 'LRD',
        paymentDate: item.paymentDate || new Date().toISOString().split('T')[0],
        receiptUrl: item.receiptUrl || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        projectId: '',
        brokerId: '',
        brokerName: '',
        amount: '',
        currency: 'LRD',
        paymentDate: toISODate(null),
        receiptUrl: '',
      });
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId || !formData.brokerName || !formData.amount) {
      toast.error('Project, broker name, and amount are required');
      return;
    }

    try {
      const docId = editingId || `brk_${Date.now()}`;
      const data = {
        projectId: formData.projectId,
        brokerId: formData.brokerId,
        brokerName: formData.brokerName,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        paymentDate: formData.paymentDate,
        receiptUrl: formData.receiptUrl,
        orgId: slugifyOrg(user!.organizationName),
      };

      await createOrUpdateDoc('broker_payments', docId, data, user!.id, !!editingId);
      mutate();
      setOpen(false);
      toast.success(editingId ? 'Broker payment updated' : 'Broker payment added');
    } catch (error) {
      toast.error('Failed to save broker payment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this broker payment?')) return;
    try {
      await deleteDocWithSync('broker_payments', id, user!.id);
      mutate();
      toast.success('Broker payment deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const filtered = (brokers || []).filter((b: any) => {
    const matchesProject = filterProject === 'all' || b.projectId === filterProject;
    const matchesSearch = (b.brokerName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (b.brokerId?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (b.projectId?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesProject && matchesSearch;
  });

  const calculateTotals = () => {
    const totals: Record<string, number> = {};
    filtered.forEach((b: any) => {
      const curr = b.currency || 'LRD';
      totals[curr] = (totals[curr] || 0) + (Number(b.amount) || 0);
    });
    return totals;
  };

  const totals = calculateTotals();
  const mainTotal = totals[currency] || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Broker Payments</h2>
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
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Payment' : 'New Broker Payment'}</DialogTitle>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Broker ID (Optional)</label>
                    <Input value={formData.brokerId} onChange={(e) => setFormData({ ...formData, brokerId: e.target.value })} placeholder="e.g. BRK-001" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Broker Name</label>
                    <Input value={formData.brokerName} onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })} placeholder="Jane Doe" />
                  </div>
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

                <div className="grid grid-cols-1">
                  <div>
                    <label className="text-sm font-medium">Payment Date</label>
                    <Input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Proof Link / Receipt</label>
                  <ImageUploadButton 
                    value={formData.receiptUrl} 
                    onChange={(url) => setFormData({ ...formData, receiptUrl: url })} 
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  {editingId ? 'Update' : 'Save'} Payment
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
            placeholder="Search broker payments by name, ID or project..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
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
        <Card><CardContent className="py-10 text-center text-muted-foreground">No broker payments found</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Project ID</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right font-bold">Amount</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.projectId}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.brokerName}</div>
                    <div className="text-xs text-muted-foreground">{item.brokerId}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{formatDate(item.paymentDate)}</TableCell>
                   <TableCell className="text-right font-semibold">
                    {formatCurrency(item.amount || 0)}
                    <span className="text-[10px] ml-1 text-muted-foreground">{item.currency || 'LRD'}</span>
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
