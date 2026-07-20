'use client';

import React from 'react';
import { useCollection } from '@/hooks/useSyncData';
import { useCurrency } from '@/lib/currency-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { DollarSign, FolderKanban, TrendingUp, TrendingDown, CheckSquare, Hammer, Briefcase, Wallet, UsersRound, PieChart, BarChart3, Activity, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PieChart as RePieChart, 
  Pie,
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

export function SummaryTab() {
  const { formatCurrency, currencyConfig, currency } = useCurrency();
  // Fetch all collections
  const { data: development_tools, isLoading: i1 } = useCollection('development_tools');
  const { data: development_costs, isLoading: i2 } = useCollection('development_costs');
  const { data: brokers, isLoading: i3 } = useCollection('broker_payments');
  const { data: miscellaneous, isLoading: i4 } = useCollection('miscellaneous');
  const { data: revenue, isLoading: i5 } = useCollection('revenue');
  const { data: projects, isLoading: i6 } = useCollection('projects');

  const isLoading = i1 || i2 || i3 || i4 || i5 || i6;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MULTI-CURRENCY LOGIC (Architectural Fix #2)
  // --------------------------------------------------------------------------
  const calculateMultiCurrencyTotals = (items: any[], amountField: string = 'amount') => {
    return items.reduce((acc: Record<string, number>, item) => {
      const currency = item.currency || 'USD'; // Fallback to USD for ACRUX
      const amount = Number(item[amountField]) || 0;
      acc[currency] = (acc[currency] || 0) + amount;
      return acc;
    }, {});
  };

  // Grouped totals by currency
  const developmentToolsByCurrency = calculateMultiCurrencyTotals(development_tools || [], 'totalCost');
  const developmentCostsByCurrency = calculateMultiCurrencyTotals(development_costs || [], 'cost');
  const brokerByCurrency = calculateMultiCurrencyTotals(brokers || [], 'amount');
  const miscellaneousByCurrency = calculateMultiCurrencyTotals(miscellaneous || [], 'amount');
  const revenueByCurrency = calculateMultiCurrencyTotals(revenue || [], 'amount');

  // Unified expense aggregator
  const currencies = Array.from(new Set([
    ...Object.keys(developmentToolsByCurrency),
    ...Object.keys(developmentCostsByCurrency),
    ...Object.keys(brokerByCurrency),
    ...Object.keys(miscellaneousByCurrency),
    ...Object.keys(revenueByCurrency)
  ]));

  const expensesByCurrency: Record<string, number> = {};
  currencies.forEach(curr => {
    expensesByCurrency[curr] = 
      (developmentToolsByCurrency[curr] || 0) + 
      (developmentCostsByCurrency[curr] || 0) + 
      (brokerByCurrency[curr] || 0) + 
      (miscellaneousByCurrency[curr] || 0);
  });

  // For charts and single-value displays, we still use the default currency's value or a specific sum
  // if mixed, but the UI should primarily show the breakdown.
  const mainCurrency = currency; // Correct property from useCurrency()
  const totalDevelopmentTools = developmentToolsByCurrency[mainCurrency] || 0;
  const totalDevelopmentCosts = developmentCostsByCurrency[mainCurrency] || 0;
  const totalBroker = brokerByCurrency[mainCurrency] || 0;
  const totalMiscellaneous = miscellaneousByCurrency[mainCurrency] || 0;

  const totalCost = totalDevelopmentTools + totalDevelopmentCosts + totalBroker + totalMiscellaneous;
  const totalBudget = (projects || []).reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalRevenue = totalBudget - totalCost; 
  const totalReceived = revenueByCurrency[mainCurrency] || 0;
  const profitLoss = totalReceived - totalCost;

  const activeProjectsCount = (projects || []).filter((p) => p.status === 'Active').length;
  const completedProjectsCount = (projects || []).filter((p) => p.status === 'Completed').length;

  // Prepare data for charts
  const costBreakdownData = [
    { name: 'Development Tools', value: totalDevelopmentTools, color: '#8b5cf6' },
    { name: 'Development Costs', value: totalDevelopmentCosts, color: '#f59e0b' },
    { name: 'Broker Payments', value: totalBroker, color: '#10b981' },
    { name: 'Miscellaneous', value: totalMiscellaneous, color: '#3b82f6' },
  ].filter(item => item.value > 0);

  const profitLossData = [
    { name: 'Total Budget', value: totalBudget, color: '#10b981' },
    { name: 'Total Costs', value: totalCost, color: '#ef4444' },
    { name: 'Net Revenue', value: totalRevenue, color: totalRevenue >= 0 ? '#3b82f6' : '#ef4444' },
  ];

  // 1. Calculate REAL Monthly Trends
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    let monthIdx = currentMonthIdx - i;
    if (monthIdx < 0) monthIdx += 12;
    last6Months.push(allMonths[monthIdx]);
  }

  const monthlyTrendData = last6Months.map(month => {
    const monthRevenue = (revenue || [])
      .filter(r => {
        const d = new Date(r.date || r.createdAt);
        return allMonths[d.getMonth()] === month && (r.currency === mainCurrency || !r.currency);
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const monthCosts = [
      ...(development_tools || []),
      ...(development_costs || []),
      ...(brokers || []),
      ...(miscellaneous || [])
    ]
      .filter(c => {
        const d = new Date(c.date || c.createdAt);
        return allMonths[d.getMonth()] === month && (c.currency === mainCurrency || !c.currency);
      })
      .reduce((sum, c) => sum + (Number(c.amount) || Number(c.totalCost) || Number(c.cost) || 0), 0);

    return {
      month,
      revenue: monthRevenue,
      costs: monthCosts,
      profit: monthRevenue - monthCosts
    };
  });

  const projectStatusData = [
    { name: 'Active', value: activeProjectsCount, color: '#3b82f6' },
    { name: 'Completed', value: completedProjectsCount, color: '#10b981' },
  ].filter(i => i.value > 0);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-300 pb-20">
      
      {/* 
        ========================================
        VIEW 1: DASHBOARD / OVERVIEW
        ========================================
      */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Company Dashboard</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <OverviewCard 
            title="Total Budget (Main)" 
            value={formatCurrency(totalBudget)} 
            icon={<Briefcase className="w-5 h-5 text-emerald-500" />} 
          />
          <OverviewCard 
            title="Total Costs" 
            value={formatCurrency(totalCost)} 
            icon={<TrendingDown className="w-5 h-5 text-amber-500" />}
            breakdown={expensesByCurrency}
          />
          <OverviewCard 
            title="Net Revenue (Main)" 
            value={totalRevenue < 0 ? `-${formatCurrency(Math.abs(totalRevenue))}` : formatCurrency(totalRevenue)} 
            icon={totalRevenue >= 0 ? <TrendingUp className="w-5 h-5 text-blue-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />} 
            className={totalRevenue >= 0 ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-red-50/50 dark:bg-red-900/10"}
            valueClass={totalRevenue >= 0 ? "text-blue-600" : "text-red-500"}
            subtext={totalRevenue >= 0 ? "Budgeted Profit" : "Budgeted Loss"}
          />
          <OverviewCard 
            title="Active Projects" 
            value={activeProjectsCount.toString()} 
            icon={<FolderKanban className="w-5 h-5 text-blue-500" />} 
          />
          <OverviewCard 
            title="Completed Projects" 
            value={completedProjectsCount.toString()} 
            icon={<CheckSquare className="w-5 h-5 text-emerald-500" />} 
          />
        </div>
      </section>

      {/* 
        ========================================
        VIEW 2: FINANCIAL CHARTS & ANALYTICS
        ========================================
      */}
      <section className="space-y-6 pt-6 border-t border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Financial Analytics</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Breakdown Pie Chart */}
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Cost Breakdown ({mainCurrency})
              </CardTitle>
              <CardDescription>Distribution of project costs in {mainCurrency}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-full h-[300px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={costBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius="80%"
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${currencyConfig.symbol}${value.toLocaleString()}`} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Project Status Chart */}
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Project Status Overview
              </CardTitle>
              <CardDescription>Active vs completed projects</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-full h-[300px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius="80%"
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <Card className="shadow-sm border-border overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              6-Month Financial Trend ({mainCurrency})
            </CardTitle>
            <CardDescription>Revenue, costs, and profit over time</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="w-full h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${currencyConfig.symbol}${(value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value)}`} />
                  <Tooltip formatter={(value: number) => `${currencyConfig.symbol}${value.toLocaleString()}`} />
                  <Legend verticalAlign="top" height={36}/>
                  <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="costs" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="profit" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Profit/Loss Bar Chart */}
        <Card className="shadow-sm border-border overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Financial Summary ({mainCurrency})
            </CardTitle>
            <CardDescription>Revenue vs costs analysis in {mainCurrency}</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitLossData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${currencyConfig.symbol}${(value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value)}`} />
                  <Tooltip formatter={(value: number) => `${currencyConfig.symbol}${value.toLocaleString()}`} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {profitLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 
        ========================================
        VIEW 3: DETAILED SUMMARY
        ========================================
      */}
      <section className="space-y-4 pt-6 border-t border-border/50">
        <h2 className="text-xl font-bold text-foreground">Detailed Cost Summary</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-0 border-t-4 border-t-blue-500">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Cost Category</TableHead>
                      <TableHead className="text-right">Total ({mainCurrency})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SummaryRow 
                      icon={<Hammer className="w-4 h-4 text-purple-500" />} 
                      label="Total Development Tools" 
                      amountBreakdown={developmentToolsByCurrency} 
                      mainAmount={totalDevelopmentTools} 
                    />
                    <SummaryRow 
                      icon={<UsersRound className="w-4 h-4 text-amber-500" />} 
                      label="Total Development Costs" 
                      amountBreakdown={developmentCostsByCurrency} 
                      mainAmount={totalDevelopmentCosts} 
                    />
                    <SummaryRow 
                      icon={<Briefcase className="w-4 h-4 text-emerald-500" />} 
                      label="Total Broker Payments" 
                      amountBreakdown={brokerByCurrency} 
                      mainAmount={totalBroker} 
                    />
                    <SummaryRow 
                      icon={<Wallet className="w-4 h-4 text-blue-500" />} 
                      label="Total Miscellaneous" 
                      amountBreakdown={miscellaneousByCurrency} 
                      mainAmount={totalMiscellaneous} 
                    />
                    <TableRow className="bg-muted/20">
                      <TableCell className="font-bold text-base whitespace-nowrap">Total Project Cost</TableCell>
                      <TableCell className="text-right font-bold text-base text-amber-600">{formatCurrency(totalCost)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="shadow-sm border-border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800 dark:text-blue-300">Financial Health ({mainCurrency})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {totalReceived > 0 
                    ? `${((profitLoss / totalReceived) * 100).toFixed(1)}%` 
                    : '0%'}
                </div>
                <p className="text-xs text-blue-600/80 dark:text-blue-400 mt-1">Overall Profit Margin</p>
                
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Target Margin</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <div className="h-2 bg-blue-200 dark:bg-blue-900/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${((profitLoss / totalReceived) * 100) >= 20 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, (totalReceived > 0 ? (profitLoss / totalReceived) * 100 : 0)))}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

    </div>
  );
}

// Helper Components
function OverviewCard({ title, value, icon, className = "", valueClass = "", subtext, breakdown }: any) {
  return (
    <Card className={`shadow-sm border-border/50 h-full ${className}`}>
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            {subtext && <p className="text-[10px] mt-0.5 font-medium opacity-70 italic">{subtext}</p>}
          </div>
          <div className="p-1.5 rounded-md bg-white/60 dark:bg-black/20 shadow-sm">{icon}</div>
        </div>
        <div className="mt-auto">
          <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ icon, label, amountBreakdown, mainAmount }: any) {
  const { formatCurrency, currency } = useCurrency();
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {icon}
          {label}
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold">{formatCurrency(mainAmount)}</TableCell>
    </TableRow>
  );
}
