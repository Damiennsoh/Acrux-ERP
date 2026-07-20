'use client';

import React, { useState, useEffect } from 'react';
import { useCollection } from '@/hooks/useSyncData';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { formatDate, toISODate } from '@/lib/utils/date';
import { createOrUpdateDoc, deleteDocWithSync, deleteProjectWithCascade } from '@/lib/sync-service';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit2, FileText, AlertTriangle } from 'lucide-react';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import { toast } from 'sonner';

export function ProjectsTab() {
  const { formatCurrency } = useCurrency();
  const { data: projects, isLoading, mutate } = useCollection('projects');
  const { data: allMaterials } = useCollection('materials');
  const { data: allLabor } = useCollection('labor');
  const { data: allRevenue } = useCollection('revenue');
  const { data: allPettyCash } = useCollection('petty_cash');
  const { data: allBrokers } = useCollection('broker_payments');
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customType, setCustomType] = useState('');

  // Cascading delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '', // User-defined ID
    name: '',
    clientName: '',
    location: '',
    projectType: 'New',
    startDate: toISODate(null),
    endDate: toISODate(null),
    status: 'Active',
    documentUrl: '',
    budget: '',
  });

  const handleOpen = (project?: any) => {
    if (project) {
      setEditingId(project.id);
      setFormData({
        projectId: project.projectId || project.id.substring(0,8),
        name: project.name,
        clientName: project.clientName || '',
        location: project.location || '',
        projectType: project.projectType || 'New',
        startDate: project.startDate ? toISODate(project.startDate) : toISODate(null),
        endDate: project.endDate ? toISODate(project.endDate) : toISODate(null),
        status: project.status || 'Active',
        documentUrl: project.documentUrl || '',
        budget: project.budget?.toString() || '',
      });
      const defaultTypes = ['New', 'Maintainance'];
      const isCustom = project.projectType && !defaultTypes.includes(project.projectType);
      if (isCustom) {
        setFormData(prev => ({ ...prev, projectType: 'Add +' }));
        setIsCustomType(true);
        setCustomType(project.projectType);
      } else {
        setIsCustomType(false);
        setCustomType('');
      }
    } else {
      setEditingId(null);
      setFormData({
        projectId: '',
        name: '',
        clientName: '',
        location: '',
        projectType: 'New',
        startDate: toISODate(null),
        endDate: toISODate(null),
        status: 'Active',
        documentUrl: '',
        budget: '',
      });
    }
    setIsCustomType(false);
    setCustomType('');
    setOpen(true);
  };

  // Dynamic Project ID Generation with Uniqueness Logic
  useEffect(() => {
    if (!editingId && formData.name.trim().length >= 3) {
      const namePart = formData.name.trim().substring(0, 3).toUpperCase();
      const year = new Date().getFullYear();
      let baseId = `PRJ-GLP-${namePart}-${year}`;
      
      // Collision detection check against existing projects
      const existingIds = projects?.map(p => p.projectId) || [];
      let finalId = baseId;
      let suffix = 65; // 'A' in ASCII
      
      while (existingIds.includes(finalId)) {
        finalId = `${baseId}-${String.fromCharCode(suffix)}`;
        suffix++;
        if (suffix > 90) break; // Z limit
      }

      setFormData(prev => {
        if (!prev.projectId || prev.projectId.startsWith('PRJ-')) {
          return { ...prev, projectId: finalId };
        }
        return prev;
      });
    }
  }, [formData.name, editingId, projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.projectId) {
      toast.error('Project ID and Project Name are required');
      return;
    }

    try {
      const docId = editingId || `proj_${Date.now()}`;
      const data = {
        projectId: formData.projectId,
        name: formData.name,
        clientName: formData.clientName,
        location: formData.location,
        projectType: isCustomType ? customType : formData.projectType,
        status: formData.status,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        documentUrl: formData.documentUrl,
        budget: parseFloat(formData.budget) || 0,
        orgId: user!.organizationName,
      };

      await createOrUpdateDoc('projects', docId, data, user!.id, !!editingId);
      
      mutate();
      setOpen(false);
      toast.success(editingId ? 'Project updated' : 'Project created');
    } catch (error) {
      toast.error('Failed to save project');
    }
  };

  const handleDelete = (project: any) => {
    // Show the detailed confirmation dialog
    setDeleteTarget(project);
  };

  const confirmDeleteProject = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteProjectWithCascade(deleteTarget.id, user!.id);
      mutate();
      toast.success(`Project "${deleteTarget.name}" and all linked records deleted`);
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Count linked records for the delete confirmation dialog
  const getLinkedCounts = (project: any): Record<string, number> => {
    if (!project) return { materials: 0, labor: 0, revenue: 0, pettyCash: 0, brokers: 0 };
    const pId = (project.id || '').toLowerCase();
    const slug = (project.projectId || '').toLowerCase();
    const match = (item: any) => {
      const v = (item.projectId || '').toLowerCase();
      return v === pId || v === slug;
    };
    return {
      materials: (allMaterials || []).filter(match).length,
      labor: (allLabor || []).filter(match).length,
      revenue: (allRevenue || []).filter(match).length,
      pettyCash: (allPettyCash || []).filter(match).length,
      brokers: (allBrokers || []).filter(match).length,
    };
  };

  const filteredProjects = projects?.filter(
    (p) => {
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesType = filterType === 'all' || p.projectType === filterType;
      const matchesSearch = (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                           (p.projectId?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                           (p.clientName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    }
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Project Info</h2>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Project' : 'New Project'}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Project ID</label>
                    <Input
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      placeholder="PRJ-1001"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Project Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Client Name</label>
                    <Input
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Client"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, State"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Project Type</label>
                    <Select 
                      value={isCustomType ? 'Custom' : formData.projectType} 
                      onValueChange={(v) => {
                        if (v === 'Custom') setIsCustomType(true);
                        else {
                          setIsCustomType(false);
                          setFormData({ ...formData, projectType: v });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New Installation</SelectItem>
                        <SelectItem value="Maintainance">Maintenance</SelectItem>
                        <SelectItem value="Custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustomType && (
                      <Input
                        className="mt-2"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        placeholder="Enter custom type"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Project Budget</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="Total Contract Price"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Completion Date</label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Document / Contract Link</label>
                  <ImageUploadButton 
                    value={formData.documentUrl} 
                    onChange={(url) => setFormData({ ...formData, documentUrl: url })} 
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  {editingId ? 'Update' : 'Create'} Project
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
            placeholder="Search projects by name, ID or client..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Maintainance">Maintainance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner className="w-8 h-8" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No projects found
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Project ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Client</TableHead>
                <TableHead className="hidden md:table-cell">Start Date</TableHead>
                <TableHead className="hidden md:table-cell">End Date</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project: any) => (
                <TableRow key={project.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{project.projectId || project.id.substring(0,8)}</TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{project.clientName || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{formatDate(project.startDate)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{project.endDate ? formatDate(project.endDate) : '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{project.projectType || '-'}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{formatCurrency(project.budget || 0)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      project.status === 'Active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {project.status}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                      {project.documentUrl && (
                        <Button variant="ghost" size="icon" onClick={() => window.open(project.documentUrl, '_blank')} className="h-8 w-8 text-blue-600">
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(project)} className="h-8 w-8">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(project)} className="h-8 w-8 text-destructive">
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

      {/* Cascading Delete Confirmation Dialog */}
      {deleteTarget && (
        <CascadeDeleteDialog
          project={deleteTarget}
          counts={getLinkedCounts(deleteTarget)}
          isDeleting={isDeleting}
          onConfirm={confirmDeleteProject}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── Cascading Delete Confirmation Dialog ──────────────────────────────────────
function CascadeDeleteDialog({
  project,
  counts,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  project: any;
  counts: Record<string, number>;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <Dialog open={!!project} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent aria-describedby={undefined} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Delete Project — Permanent Action
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            You are about to permanently delete <span className="font-bold">&quot;{project?.name}&quot;</span> ({project?.projectId}).
            This action will cascade-delete all linked financial records.
          </p>
          {totalLinked > 0 ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
              <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">Records that will be deleted:</p>
              <div className="grid grid-cols-2 gap-y-1 text-sm">
                {counts.materials > 0 && <span className="text-red-600">{counts.materials} Material record{counts.materials !== 1 ? 's' : ''}</span>}
                {counts.labor > 0 && <span className="text-red-600">{counts.labor} Labor record{counts.labor !== 1 ? 's' : ''}</span>}
                {counts.revenue > 0 && <span className="text-red-600">{counts.revenue} Payment record{counts.revenue !== 1 ? 's' : ''}</span>}
                {counts.pettyCash > 0 && <span className="text-red-600">{counts.pettyCash} Petty Cash record{counts.pettyCash !== 1 ? 's' : ''}</span>}
                {counts.brokers > 0 && <span className="text-red-600">{counts.brokers} Broker Payment{counts.brokers !== 1 ? 's' : ''}</span>}
              </div>
              <p className="text-xs text-red-500 font-medium pt-1">
                Total: {totalLinked} linked record{totalLinked !== 1 ? 's' : ''} will also be removed.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">No linked financial records found for this project.</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Records are soft-deleted in the cloud database for audit compliance but will not appear in the UI or any financial reports.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : `Yes, Delete Everything`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
