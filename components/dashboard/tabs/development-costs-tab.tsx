'use client';

import React, { useState } from 'react';
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

export function DevelopmentCostsTab() {
  const { formatCurrency, currency } = useCurrency();
  const { data: development_costs, isLoading, mutate } = useCollection('development_costs');
  const { data: projects } = useCollection('projects');
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    developerId: '',
    developerName: '',
    role: '',
    cost: '',
    currency: 'USD',
    receiptUrl: '',
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        projectId: item.projectId,
        developerId: item.developerId || '',
        developerName: item.developerName,
        role: item.role || '',
        cost: item.cost.toString(),
        currency: item.currency || 'USD',
        receiptUrl: item.receiptUrl || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        projectId: '',
        developerId: '',
        developerName: '',
        role: '',
        cost: '',
        currency: 'USD',
        receiptUrl: '',
      });
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId || !formData.developerName || !formData.cost) {
      toast.error('Project, developer name, and cost amount are required');
      return;
    }

    try {
      const docId = editingId || `dev_${Date.now()}`;
      const data = {
        projectId: formData.projectId,
        developerId: formData.developerId,
        developerName: formData.developerName,
        role: formData.role,
        cost: parseFloat(formData.cost),
        currency: formData.currency,
        receiptUrl: formData.receiptUrl,
        orgId: slugifyOrg(user!.organizationName),
      };

      await createOrUpdateDoc('development_costs', docId, data, user!.id, !!editingId);
      mutate();
      setOpen(false);
      toast.success(editingId ? 'Development cost record updated' : 'Development cost record added');
    } catch (error) {
      toast.error('Failed to save development cost record');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this development cost record?')) return;
    try {
      await deleteDocWithSync('development_costs', id, user!.id);
      mutate();
      toast.success('Development cost record deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const filtered = (development_costs || []).filter((l: any) => {
    const matchesProject = filterProject === 'all' || l.projectId === filterProject;
    const matchesSearch = (l.developerName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (l.developerId?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (l.role?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (l.projectId?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesProject && matchesSearch;
  });

  const calculateTotals = () => {
    const totals: Record<string, number> = {};
    filtered.forEach((l: any) => {
      const curr = l.currency || 'USD';
      totals[curr] = (totals[curr] || 0) + (Number(l.cost) || 0);
    });
    return totals;
  };

  const totals = calculateTotals();
  const mainTotal = totals[currency] || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Development Costs</h2>
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
                Add Development Cost
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Development Cost' : 'New Development Cost Record'}</DialogTitle>
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
                    <label className="text-sm font-medium">Developer ID (Optional)</label>
                    <Input value={formData.developerId} onChange={(e) => setFormData({ ...formData, developerId: e.target.value })} placeholder="e.g. DEV-001" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Developer Name</label>
                    <Input value={formData.developerName} onChange={(e) => setFormData({ ...formData, developerName: e.target.value })} placeholder="John Doe" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Frontend">Frontend Developer</SelectItem>
                        <SelectItem value="Backend">Backend Developer</SelectItem>
                        <SelectItem value="Full Stack">Full Stack Developer</SelectItem>
                        <SelectItem value="DevOps">DevOps Engineer</SelectItem>
                        <SelectItem value="QA">QA Engineer</SelectItem>
                        <SelectItem value="PM">Project Manager</SelectItem>
                        <SelectItem value="Designer">UI/UX Designer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                        <SelectItem value="GHS">GHS (Ghanaian Cedi)</SelectItem>
                        <SelectItem value="ZWL">ZWL (Zimbabwean Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                    <label className="text-sm font-medium">Cost Amount</label>
                    <Input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} placeholder="0.00" />
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
                  {editingId ? 'Update' : 'Save'} Development Cost Record
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
            placeholder="Search development costs by developer name, ID or role..." 
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
        <Card><CardContent className="py-10 text-center text-muted-foreground">No development cost records found</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Project ID</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="text-right font-bold">Cost</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.projectId}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.developerName}</div>
                    <div className="text-xs text-muted-foreground">{item.developerId}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{item.role}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.cost || 0)}
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
