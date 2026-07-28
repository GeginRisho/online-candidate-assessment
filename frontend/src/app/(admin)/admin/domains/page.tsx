'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiClient } from '@/services/apiClient';

interface Domain {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchAllDomains(): Promise<Domain[]> {
  const { data } = await apiClient.get('/domains/all');
  return data.data;
}

async function createDomain(name: string): Promise<Domain> {
  const { data } = await apiClient.post('/domains', { name });
  return data.data;
}

async function updateDomain(payload: { id: string; name: string; isActive: boolean }): Promise<Domain> {
  const { data } = await apiClient.put(`/domains/${payload.id}`, {
    name: payload.name,
    isActive: payload.isActive,
  });
  return data.data;
}

async function deleteDomain(id: string): Promise<void> {
  await apiClient.delete(`/domains/${id}`);
}

export default function AdminDomainsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [editDomain, setEditDomain] = React.useState<Domain | null>(null);
  const [newName, setNewName] = React.useState('');
  const [editName, setEditName] = React.useState('');

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['admin-domains'],
    queryFn: fetchAllDomains,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: createDomain,
    onSuccess: () => {
      toast.success('Domain created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      setNewName('');
      setShowCreateDialog(false);
    },
    onError: (err: any) => {
      toast.error('Failed to create domain: ' + (err.response?.data?.message ?? err.message));
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateDomain,
    onSuccess: () => {
      toast.success('Domain updated');
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      setEditDomain(null);
    },
    onError: (err: any) => {
      toast.error('Failed to update domain: ' + (err.response?.data?.message ?? err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => {
      toast.success('Domain deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
    },
    onError: (err: any) => {
      toast.error('Failed to delete domain: ' + (err.response?.data?.message ?? err.message));
    },
  });

  const filtered = domains.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = domains.filter((d) => d.isActive).length;
  const inactiveCount = domains.length - activeCount;

  function handleToggleActive(domain: Domain) {
    updateMutation.mutate({ id: domain.id, name: domain.name, isActive: !domain.isActive });
  }

  function handleEditSave() {
    if (!editDomain || !editName.trim()) return;
    updateMutation.mutate({ id: editDomain.id, name: editName.trim(), isActive: editDomain.isActive });
  }

  function handleDeleteConfirm(domain: Domain) {
    if (!confirm(`Delete domain "${domain.name}"? This action cannot be undone.`)) return;
    deleteMutation.mutate(domain.id);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="size-6 text-blue-600" />
            Domain Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and manage assessment domains. Candidates see only active domains.
          </p>
        </div>
        <Button
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          onClick={() => { setNewName(''); setShowCreateDialog(true); }}
        >
          <Plus className="size-4" />
          Add Domain
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Domains', value: domains.length, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Inactive', value: inactiveCount, icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-100' },
        ].map((s) => (
          <Card key={s.label} className="border-border shadow-sm rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`${s.bg} rounded-lg p-2.5`}>
                <s.icon className={`size-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Domain Table */}
      <Card className="border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-border bg-slate-50/60 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground" />
              All Domains
            </CardTitle>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                className="h-8 pl-8 text-sm rounded-lg border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-blue-600" />
            <span className="ml-3 text-sm text-muted-foreground">Loading domains...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Globe className="size-10 text-slate-300" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? 'No domains match your search.' : 'No domains configured yet.'}
            </p>
            {!search && (
              <Button
                size="sm"
                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white mt-1"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="size-3.5" />Add First Domain
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/40">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Domain Name</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Created</th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((domain) => (
                  <tr key={domain.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`size-2 rounded-full ${domain.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-semibold text-foreground">{domain.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        domain.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {domain.isActive ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                        {domain.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {new Date(domain.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 gap-1.5 text-xs font-medium ${
                            domain.isActive
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          onClick={() => handleToggleActive(domain)}
                          disabled={updateMutation.isPending}
                        >
                          {domain.isActive
                            ? <ToggleLeft className="size-3.5" />
                            : <ToggleRight className="size-3.5" />}
                          {domain.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => { setEditDomain(domain); setEditName(domain.name); }}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteConfirm(domain)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Domain Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-blue-600" />
              Add New Domain
            </DialogTitle>
            <DialogDescription>
              Enter a unique name for the assessment domain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              id="new-domain-name"
              placeholder="e.g. Cloud Computing"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createMutation.mutate(newName.trim()); }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                onClick={() => createMutation.mutate(newName.trim())}
                disabled={!newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Create Domain
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Domain Dialog */}
      <Dialog open={!!editDomain} onOpenChange={(open) => { if (!open) setEditDomain(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-blue-600" />
              Edit Domain
            </DialogTitle>
            <DialogDescription>
              Update the name for &quot;{editDomain?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              id="edit-domain-name"
              placeholder="Domain name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditDomain(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                onClick={handleEditSave}
                disabled={!editName.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
