'use client';

import React, { useState, useEffect } from 'react';
import { useCollection } from '@/hooks/useSyncData';
import { useAuth } from '@/lib/auth-context';
import { slugifyOrg } from '@/lib/utils/org';
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

export function DevelopmentToolsTab() {
  const { formatCurrency, currency } = useCurrency();
  const { data: development_tools, isLoading, mutate } = useCollection('development_tools');
  const { data: projects } = useCollection('projects');
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    toolName: '',
    quantity: '1',
    unitCost: '0.00',
    receiptUrl: '',
    currency: 'USD',
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        projectId: item.projectId,
        toolName: item.toolName,
        quantity: item.quantity.toString(),
        unitCost: item.unitCost.toString(),
        receiptUrl: item.receiptUrl || '',
        currency: item.currency || 'USD',
      });
    } else {
      setEditingId(null);
      setFormData({
        projectId: '',
        toolName: '',
        quantity: '1',
        unitCost: '',
        receiptUrl: '',
        currency: 'USD',
      });
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId || !formData.toolName || !formData.quantity || !formData.unitCost) {
      toast.error('Project, tool name, quantity, and unit cost are required');
      return;
    }

    try {
      const docId = editingId || `tool_${Date.now()}`;
      const qty = parseFloat(formData.quantity);
      const cost = parseFloat(formData.unitCost);
      const data = {
        projectId: formData.projectId,
        toolName: formData.toolName,
        quantity: qty,
        unitCost: cost,
        totalCost: qty * cost,
        receiptUrl: formData.receiptUrl,
        currency: formData.currency,
        orgId: slugifyOrg(user!.organizationName),
      };

      await createOrUpdateDoc('development_tools', docId, data, user!.id, !!editingId);
      mutate();
      setOpen(false);
      toast.success(editingId ? 'Development tool updated' : 'Development tool added');
    } catch (error) {
      toast.error('Failed to save development tool');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this development tool record?')) return;
    try {
      await deleteDocWithSync('development_tools', id, user!.id);
      mutate();
      toast.success('Development tool deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const filtered = (development_tools || []).filter((m: any) => {
    const matchesProject = filterProject === 'all' || m.projectId === filterProject;
    const matchesSearch = (m.toolName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (m.projectId?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesProject && matchesSearch;
  });

  const calculateTotals = () => {
    const totals: Record<string, number> = {};
    filtered.forEach((m: any) => {
      const curr = m.currency || 'USD';
      totals[curr] = (totals[curr] || 0) + (Number(m.totalCost) || 0);
    });
    return totals;
  };

  const totals = calculateTotals();
  const mainTotal = totals[currency] || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Development Tools</h2>
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
                Add Development Tool
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Development Tool' : 'New Development Tool'}</DialogTitle>
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
                  <label className="text-sm font-medium">Tool Name</label>
                  <Input value={formData.toolName} onChange={(e) => setFormData({ ...formData, toolName: e.target.value })} placeholder="e.g. OpenAI API Credits" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unit Cost</label>
                    <Input type="number" step="0.01" value={formData.unitCost} onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })} placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="GHS">GHS (₵)</SelectItem>
                      <SelectItem value="ZWL">ZWL (Z$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-semibold text-right">
                    Total: { formatCurrency(((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitCost) || 0))) }
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Receipt / Invoice</label>
                  <ImageUploadButton 
                    value={formData.receiptUrl} 
                    onChange={(url) => setFormData({ ...formData, receiptUrl: url })} 
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  {editingId ? 'Update' : 'Save'} Development Tool
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
            placeholder="Search development tools by name or project ID..." 
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
        <Card><CardContent className="py-10 text-center text-muted-foreground">No development tools found</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Project ID</TableHead>
                <TableHead>Tool Name</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Quantity</TableHead>
                <TableHead className="text-right hidden md:table-cell">Unit Cost</TableHead>
                <TableHead className="text-right font-bold">Total Cost</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.projectId}</TableCell>
                  <TableCell className="font-medium text-sm">{item.toolName}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right hidden md:table-cell text-sm">{formatCurrency(item.unitCost)} <span className="text-[10px] text-muted-foreground ml-1">{item.currency || 'USD'}</span></TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost)} <span className="text-[10px] text-muted-foreground ml-1">{item.currency || 'USD'}</span></TableCell>
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
