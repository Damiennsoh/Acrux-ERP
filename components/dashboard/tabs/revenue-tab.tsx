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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, TrendingUp, Wallet, Receipt, Calculator, Briefcase, Trash2, Edit2, ChevronDown, Landmark, Truck, Hammer, Users } from 'lucide-react';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import { toast } from 'sonner';
import { slugifyOrg } from '@/lib/utils/org';
import { formatDate, toISODate } from '@/lib/utils/date';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function RevenueTab() {
  const { formatCurrency, currency } = useCurrency();
  const { data: rawRevenue, isLoading: i1, mutate: m1 } = useCollection('revenue');
  const { data: projects, isLoading: i2 } = useCollection('projects');
  const { data: materials, isLoading: i3 } = useCollection('materials');
  const { data: labor, isLoading: i4 } = useCollection('labor');
  const { data: brokers, isLoading: i5 } = useCollection('broker_payments');
  const { data: pettyCash, isLoading: i6 } = useCollection('petty_cash');
  
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    paymentDate: toISODate(null),
    amountReceived: '',
    currency: 'LRD',
    description: 'Project installment',
    receiptUrl: '',
  });
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentLogSearch, setPaymentLogSearch] = useState('');

  const isLoading = i1 || i2 || i3 || i4 || i5 || i6;

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId || !formData.amountReceived) {
      toast.error('Project and Amount are required');
      return;
    }

    try {
      const paymentId = editingPaymentId || `pay_${Date.now()}`;
      const data = {
        projectId: formData.projectId,
        description: formData.description,
        amount: parseFloat(formData.amountReceived),
        currency: formData.currency,
        date: new Date(formData.paymentDate).getTime(),
        receiptUrl: formData.receiptUrl,
        orgId: slugifyOrg(user!.organizationName),
      };

      await createOrUpdateDoc('revenue', paymentId, data, user!.id, !!editingPaymentId);
      m1();
      setOpen(false);
      setEditingPaymentId(null);
      setFormData({
         projectId: '',
         paymentDate: toISODate(null),
         amountReceived: '',
         currency: 'LRD',
         description: 'Project installment',
         receiptUrl: '',
      });
      toast.success(editingPaymentId ? 'Payment updated successfully' : 'Payment logged successfully');
    } catch (error) {
      toast.error('Failed to log payment');
    }
  };

  const handleEditPayment = (pay: any) => {
    setEditingPaymentId(pay.id);
    setFormData({
      projectId: pay.projectId,
      amountReceived: pay.amount.toString(),
      currency: pay.currency || 'LRD',
      paymentDate: toISODate(pay.date),
      receiptUrl: pay.receiptUrl || '',
      description: pay.description || '',
    });
    setOpen(true);
  };

  // --------------------------------------------------------------------------
  // CLIENT-SIDE FINANCIAL MIRROR (Architectural Fix)
  // --------------------------------------------------------------------------
  const calculateProjectMirror = () => {
    if (!projects) return [];

    return projects.map((proj: any) => {
      const pId = proj.id;
      const slug = proj.projectId;
      // Normalize once for case-insensitive matching
      const pIdLower = (pId || '').trim().toLowerCase();
      const slugLower = (slug || '').trim().toLowerCase();

      const matchProject = (itemProjectId: string) => {
        const val = (itemProjectId || '').trim().toLowerCase();
        return val === pIdLower || val === slugLower;
      };

      const projectMaterials = (materials || []).filter(m => matchProject(m.projectId));
      const projectLabor = (labor || []).filter(l => matchProject(l.projectId));
      const projectBrokers = (brokers || []).filter(b => matchProject(b.projectId));
      const projectPetty = (pettyCash || []).filter(pc => matchProject(pc.projectId));
      const projectRevenue = (rawRevenue || []).filter(r => matchProject(r.projectId));

      const sums: any = {
        total_materials: 0,
        total_labor: 0,
        total_broker: 0,
        total_petty: 0,
        amount_received: 0,
        // Currency breakdowns
        materials_by_curr: {},
        labor_by_curr: {},
        broker_by_curr: {},
        petty_by_curr: {},
        revenue_by_curr: {},
        expenses_by_curr: {}
      };

      const process = (items: any[], field: string, sumKey: string, breakKey: string) => {
        items.forEach(item => {
          const curr = item.currency || 'LRD';
          const amt = Number(item[field]) || 0;
          if (curr === currency) sums[sumKey] += amt;
          sums[breakKey][curr] = (sums[breakKey][curr] || 0) + amt;
          sums.expenses_by_curr[curr] = (sums.expenses_by_curr[curr] || 0) + amt;
        });
      };

      process(projectMaterials, 'totalCost', 'total_materials', 'materials_by_curr');
      process(projectLabor, 'payment', 'total_labor', 'labor_by_curr');
      process(projectBrokers, 'amount', 'total_broker', 'broker_by_curr');
      process(projectPetty, 'amount', 'total_petty', 'petty_by_curr');

      projectRevenue.forEach(item => {
        const curr = item.currency || 'LRD';
        const amt = Number(item.amount) || 0;
        if (curr === currency) sums.amount_received += amt;
        sums.revenue_by_curr[curr] = (sums.revenue_by_curr[curr] || 0) + amt;
      });

      const total_expenses = sums.total_materials + sums.total_labor + sums.total_broker + sums.total_petty;
      const budgeted_profit = (proj.budget || 0) - total_expenses;
      const outstanding = (proj.budget || 0) - sums.amount_received;

      return {
        ...proj,
        project_name: proj.name,
        total_budget: proj.budget || 0,
        ...sums,
        total_expenses,
        company_revenue: budgeted_profit,
        outstanding,
        proof_link: proj.documentUrl
      };
    });
  };

  const projectMirrors = calculateProjectMirror();

  const filtered = projectMirrors.filter((r: any) => {
    return (r.project_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
           (r.projectId?.toLowerCase() || '').includes(searchQuery.toLowerCase());
  });

  // Aggregate stats (Main Currency)
  const totalBudget = filtered.reduce((sum: number, r: any) => sum + (r.total_budget || 0), 0);
  const totalExpenses = filtered.reduce((sum: number, r: any) => sum + (r.total_expenses || 0), 0);
  const totalReceived = filtered.reduce((sum: number, r: any) => sum + (r.amount_received || 0), 0);
  const totalProfit = totalBudget - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Financial Health Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Budget" value={formatCurrency(totalBudget)} icon={<Briefcase className="w-4 h-4 text-blue-500"/>} />
        <StatsCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={<Receipt className="w-4 h-4 text-red-500"/>} />
        <StatsCard title="Budgeted Profit" value={formatCurrency(totalProfit)} icon={<TrendingUp className="w-4 h-4 text-emerald-500"/>} />
        <StatsCard title="Total Cash Received" value={formatCurrency(totalReceived)} icon={<Wallet className="w-4 h-4 text-purple-500"/>} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financial Mirror</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time aggregate of project budgets, costs, and income.</p>
        </div>
        
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Log Project Payment
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingPaymentId ? 'Edit Payment Record' : 'Log Payment Received'}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmitPayment} className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Select Project</label>
                  <Select value={formData.projectId} onValueChange={(val) => setFormData({ ...formData, projectId: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Which project is paying?" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((p: any) => (
                        <SelectItem key={p.id} value={p.projectId || p.id}>{p.name || 'Untitled'} ({p.projectId || p.id.substring(0,8)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Payment Description</label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. 50% Upfront" />
                </div>

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
                  <label className="text-sm font-medium">Amount Received</label>
                  <Input type="number" step="0.01" value={formData.amountReceived} onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })} placeholder="0.00" />
                </div>

                <div>
                  <label className="text-sm font-medium">Date Received</label>
                  <Input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Proof of Payment</label>
                  <ImageUploadButton 
                    value={formData.receiptUrl} 
                    onChange={(url) => setFormData({ ...formData, receiptUrl: url })} 
                  />
                </div>

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Save Payment Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Input 
          placeholder="Filter by project name or ID..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="w-8 h-8" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No project data available in the financial mirror</CardContent></Card>
      ) : (
        <div className="space-y-3">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {filtered.map((report: any) => {
              const profitPercent = report.total_budget > 0 ? (report.company_revenue / report.total_budget) * 100 : 0;
              const isProfit = report.company_revenue >= 0;
              
              return (
                <AccordionItem 
                  key={report.id} 
                  value={report.id} 
                  className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex flex-1 items-center justify-between text-left pr-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-tight">{report.projectId}</span>
                        <span className="font-bold text-sm md:text-base text-foreground line-clamp-1">{report.project_name}</span>
                      </div>
                      
                      <div className="hidden md:flex flex-col items-end gap-1 px-8 border-x border-border/20">
                        <span className="text-[10px] text-muted-foreground uppercase">Budget</span>
                        <span className="font-bold text-sm">{formatCurrency(report.total_budget)}</span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase">Budgeted Profit</span>
                        <span className={`font-bold text-sm ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatCurrency(report.company_revenue)}
                          <span className="ml-1 text-[10px]">({profitPercent.toFixed(0)}%)</span>
                        </span>
                      </div>

                       {/* Smart Payment Status */}
                        {(() => {
                          const budgetAmt = report.total_budget || 0;
                          
                          // Summing all revenues regardless of currency for a simpler equality check
                          const totalReceivedAllCurrencies = Object.values(report.revenue_by_curr || {}).reduce((sum: number, amt: any) => sum + Number(amt), 0) as number;
                          const receivedAmt = totalReceivedAllCurrencies;

                          let label = 'Unpaid';
                          let cls = 'bg-gray-100 text-gray-600';
                          if (receivedAmt > 0 && budgetAmt > 0) {
                            if (receivedAmt >= budgetAmt) {
                              label = 'Fully Paid';
                              cls = 'bg-emerald-100 text-emerald-700';
                            } else {
                              label = 'Partial';
                              cls = 'bg-amber-100 text-amber-700';
                            }
                          } else if (receivedAmt > 0) {
                            label = 'Partial';
                            cls = 'bg-amber-100 text-amber-700';
                          }
                          return (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${cls}`}>
                              {label}
                            </span>
                          );
                        })()}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pt-2 border-t border-border/40">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Detailed Cost Breakdown */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                           <Calculator className="w-3 h-3" /> Drill-Down Breakdown
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <BreakdownRow label="Material Cost" value={report.total_materials} icon={<Truck className="w-3 h-3"/>} />
                           <BreakdownRow label="Labor Cost" value={report.total_labor} icon={<Hammer className="w-3 h-3"/>} />
                           <BreakdownRow label="Broker Fee" value={report.total_broker} icon={<Users className="w-3 h-3"/>} />
                           <BreakdownRow label="Petty Cash" value={report.total_petty} icon={<Wallet className="w-3 h-3"/>} />
                        </div>
                        <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center mt-2">
                           <span className="text-xs font-bold">Total Expenses</span>
                           <span className="font-bold text-red-500">{formatCurrency(report.total_expenses)}</span>
                        </div>
                      </div>

                      {/* Payment Progress */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                           <Landmark className="w-3 h-3" /> Collection Status
                        </h4>
                        <div className="space-y-3">
                           <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground text-xs">Actual Cash Received</span>
                              <span className="font-bold text-emerald-600">{formatCurrency(report.amount_received)}</span>
                           </div>
                           <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground text-xs">Outstanding Balance</span>
                              <span className="font-bold text-amber-600">{formatCurrency(report.outstanding)}</span>
                           </div>
                           <div className="flex justify-between text-sm pt-2 border-t border-border/20">
                              <span className="text-muted-foreground text-xs">Real-time Profit</span>
                              <span className={`font-bold ${report.amount_received - report.total_expenses >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {formatCurrency(report.amount_received - report.total_expenses)}
                              </span>
                           </div>
                           <div className="pt-2">
                              {report.proof_link && (
                                <Button 
                                  variant="outline" 
                                  className="w-full text-xs h-9 gap-2 text-blue-600 border-blue-200"
                                  onClick={() => window.open(report.proof_link, '_blank')}
                                >
                                  <FileText className="w-4 h-4" /> View Contract/MOU
                                </Button>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
      {/* Payment History Log */}
      <section className="pt-10 border-t border-border/50">
        <h3 className="text-xl font-bold text-foreground mb-4">Payment Log</h3>
        <Card className="shadow-none border-border/30">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Project ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount Received</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Search in log */}
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={6} className="p-2 pb-4">
                     <Input 
                        placeholder="Search specific project logs..." 
                        value={paymentLogSearch}
                        onChange={(e) => setPaymentLogSearch(e.target.value)}
                        className="h-8 text-xs bg-muted/20"
                     />
                  </TableCell>
                </TableRow>
                {(rawRevenue || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No payment records found.</TableCell>
                  </TableRow>
                ) : (
                  (rawRevenue || [])
                  .filter((p: any) => (p.projectId || '').toLowerCase().includes(paymentLogSearch.toLowerCase()) || 
                                     (p.description || '').toLowerCase().includes(paymentLogSearch.toLowerCase()))
                  .sort((a: any, b: any) => (b.date || 0) - (a.date || 0))
                  .map((pay: any) => (
                    <TableRow key={pay.id}>
                      <TableCell className="font-mono text-[10px]">{pay.projectId}</TableCell>
                      <TableCell className="text-sm">{pay.description || '-'}</TableCell>
                      <TableCell className="text-xs">{formatDate(pay.date)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {formatCurrency(pay.amount)} 
                        <span className="text-[10px] ml-1 text-muted-foreground">{pay.currency || 'LRD'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {pay.receiptUrl && (
                          <Button variant="ghost" size="icon" onClick={() => window.open(pay.receiptUrl, '_blank')} className="h-7 w-7 text-blue-500">
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditPayment(pay)}
                              className="h-7 w-7 text-blue-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={async () => {
                                if (confirm('ARE YOU SURE? Deleting this payment will reduce your total revenue in the mirror.')) {
                                  await deleteDocWithSync('revenue', pay.id, user!.id);
                                  m1();
                                  toast.success('Payment deleted');
                                }
                              }} 
                              className="h-7 w-7 text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatsCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm border-border/50 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
          {title}
          {icon}
        </div>
        <div className="text-xl font-bold truncate tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ label, value, icon }: any) {
   const { formatCurrency } = useCurrency();
   return (
      <div className="flex items-center justify-between p-2 rounded border border-border/20 bg-muted/20">
         <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            {icon}
            {label}
         </div>
         <span className="text-xs font-bold">{formatCurrency(value || 0)}</span>
      </div>
   );
}
