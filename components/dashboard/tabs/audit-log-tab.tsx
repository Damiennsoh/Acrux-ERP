'use client';

import React, { useState, useMemo } from 'react';
import { useSupabaseCollection } from '@/hooks/useSupabaseData';
import { formatDate } from '@/lib/utils/date';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, History, AlertCircle } from 'lucide-react';

export function AuditLogTab() {
  const { data: auditLogs, isLoading } = useSupabaseCollection('audit_logs');
  const { data: userProfiles } = useSupabaseCollection('user_profiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  // Build a lookup map: userId → display name
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (userProfiles || []).forEach((profile: any) => {
      if (profile.id) {
        map[profile.id] = profile.name || profile.staffId || profile.email || profile.id.substring(0, 8);
      }
    });
    return map;
  }, [userProfiles]);

  // Unique entity types for filter
  const entityTypes = useMemo(() => {
    const types = new Set<string>();
    (auditLogs || []).forEach((log: any) => {
      if (log.entityType) types.add(log.entityType);
    });
    return Array.from(types).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return (auditLogs || [])
      .filter((log: any) => {
        if (filterAction !== 'all' && (log.action || '').toUpperCase() !== filterAction) return false;
        if (filterEntity !== 'all' && log.entityType !== filterEntity) return false;

        if (!searchQuery) return true;
        const searchStr = searchQuery.toLowerCase();
        const entityType = (log.entityType || '').toLowerCase();
        const entityId = (log.entityId || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const details = JSON.stringify(log.changes || {}).toLowerCase();
        const userName = (userNameMap[log.userId] || log.userId || '').toLowerCase();

        return (
          entityType.includes(searchStr) ||
          entityId.includes(searchStr) ||
          action.includes(searchStr) ||
          details.includes(searchStr) ||
          userName.includes(searchStr)
        );
      })
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, searchQuery, filterAction, filterEntity, userNameMap]);

  const getActionBadge = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'CREATE': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-2">CREATE</Badge>;
      case 'UPDATE': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-2">UPDATE</Badge>;
      case 'DELETE': return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-2">DELETE</Badge>;
      default: return <Badge variant="outline" className="text-[10px] px-2">{action}</Badge>;
    }
  };

  const getChangeSummary = (log: any) => {
    if (log.action === 'DELETE') {
      const old = log.changes?.old || {};
      const name = old.name || old.description || old.itemName || old.workerName || old.brokerName || log.entityId;
      return `Deleted: "${name}"`;
    }
    if (log.action === 'CREATE') {
      const data = log.changes?.new || {};
      const name = data.name || data.description || data.itemName || data.workerName || data.brokerName || log.entityId;
      return `Created: "${name}"`;
    }
    if (log.action === 'UPDATE') {
      const oldData = log.changes?.old || {};
      const newData = log.changes?.new || {};
      const changedKeys = Object.keys(newData).filter(k => {
        const skip = ['updatedAt', 'createdAt', 'serverUpdatedAt', 'updatedBy'];
        if (skip.includes(k)) return false;
        return JSON.stringify(newData[k]) !== JSON.stringify(oldData[k]);
      });
      if (changedKeys.length === 0) return 'No visible changes';
      return `Changed: ${changedKeys.join(', ')}`;
    }
    return JSON.stringify(log.changes?.new || log.changes?.old || {}).substring(0, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            Audit Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Full traceability of all system changes. {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found.
          </p>
        </div>
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">CREATE</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="All Collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collections</SelectItem>
              {entityTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by user name, collection, document ID, or action..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-white/50 dark:bg-black/20 border-border shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-10 h-10" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-20 text-center flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No audit logs match your filter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[150px] text-[10px] font-bold uppercase tracking-wider">Timestamp</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">User</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Collection</TableHead>
                <TableHead className="hidden md:table-cell text-[10px] font-bold uppercase tracking-wider">Document ID</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Action</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Changes / Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log: any) => (
                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-foreground">
                      {userNameMap[log.userId] || 'System'}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {log.userId?.substring(0, 8)}…
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      {log.entityType}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-[10px] text-muted-foreground max-w-[120px] truncate">
                    {log.entityId}
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[350px] text-[11px] text-muted-foreground">
                      {getChangeSummary(log)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
