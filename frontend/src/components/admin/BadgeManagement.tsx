import { useState } from 'react';
import { Plus, Pencil, Trash2, Trophy, Zap, Target, X, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useGetAllBadgeDefinitions, useCreateBadgeDefinition, useUpdateBadgeDefinition, useDeleteBadgeDefinition } from '../../hooks/useQueries';
import type { BadgeDefinition, BadgeCriteria } from '../../backend';
import { toast } from 'sonner';
import { InlineLoading } from '../common/LoadingState';

type CriteriaType = 'totalWins' | 'winsStreak' | 'totalGames';

interface BadgeFormState {
  id: string;
  name: string;
  description: string;
  criteriaType: CriteriaType;
  threshold: string;
}

const CRITERIA_LABELS: Record<CriteriaType, string> = {
  totalWins: 'Total Wins',
  winsStreak: 'Win Streak',
  totalGames: 'Total Games Played',
};

const CRITERIA_ICONS: Record<CriteriaType, React.ReactNode> = {
  totalWins: <Trophy className="h-4 w-4" />,
  winsStreak: <Zap className="h-4 w-4" />,
  totalGames: <Target className="h-4 w-4" />,
};

function criteriaFromForm(type: CriteriaType, threshold: bigint): BadgeCriteria {
  switch (type) {
    case 'totalWins':
      return { __kind__: 'totalWins', totalWins: threshold };
    case 'winsStreak':
      return { __kind__: 'winsStreak', winsStreak: threshold };
    case 'totalGames':
      return { __kind__: 'totalGames', totalGames: threshold };
  }
}

function criteriaToForm(criteria: BadgeCriteria): { type: CriteriaType; threshold: string } {
  switch (criteria.__kind__) {
    case 'totalWins':
      return { type: 'totalWins', threshold: criteria.totalWins.toString() };
    case 'winsStreak':
      return { type: 'winsStreak', threshold: criteria.winsStreak.toString() };
    case 'totalGames':
      return { type: 'totalGames', threshold: criteria.totalGames.toString() };
  }
}

function getCriteriaDescription(criteria: BadgeCriteria): string {
  switch (criteria.__kind__) {
    case 'totalWins':
      return `${criteria.totalWins} total wins`;
    case 'winsStreak':
      return `${criteria.winsStreak}-game win streak`;
    case 'totalGames':
      return `${criteria.totalGames} total games`;
  }
}

const emptyForm: BadgeFormState = {
  id: '',
  name: '',
  description: '',
  criteriaType: 'totalWins',
  threshold: '10',
};

export default function BadgeManagement() {
  const { data: badges = [], isLoading } = useGetAllBadgeDefinitions();
  const createMutation = useCreateBadgeDefinition();
  const updateMutation = useUpdateBadgeDefinition();
  const deleteMutation = useDeleteBadgeDefinition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BadgeFormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isEditing = editingId !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setForm({ ...emptyForm, id: `badge-${Date.now()}` });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (badge: BadgeDefinition) => {
    const { type, threshold } = criteriaToForm(badge.criteria);
    setForm({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      criteriaType: type,
      threshold,
    });
    setEditingId(badge.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Badge name is required');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Badge description is required');
      return;
    }
    const thresholdNum = parseInt(form.threshold, 10);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      toast.error('Threshold must be a positive number');
      return;
    }

    const definition: BadgeDefinition = {
      id: form.id,
      name: form.name.trim(),
      description: form.description.trim(),
      criteria: criteriaFromForm(form.criteriaType, BigInt(thresholdNum)),
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync(definition);
        toast.success('Badge updated successfully');
      } else {
        await createMutation.mutateAsync(definition);
        toast.success('Badge created successfully');
      }
      closeForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save badge');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Badge deleted successfully');
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete badge');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {badges.length} badge{badges.length !== 1 ? 's' : ''} defined
        </p>
        {!showForm && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New Badge
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{isEditing ? 'Edit Badge' : 'Create Badge'}</h4>
            <Button variant="ghost" size="icon" onClick={closeForm} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="badge-name">Name</Label>
              <Input
                id="badge-name"
                placeholder="e.g. First Blood"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="badge-criteria">Criteria Type</Label>
              <Select
                value={form.criteriaType}
                onValueChange={v => setForm(f => ({ ...f, criteriaType: v as CriteriaType }))}
              >
                <SelectTrigger id="badge-criteria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CRITERIA_LABELS) as CriteriaType[]).map(type => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        {CRITERIA_ICONS[type]}
                        {CRITERIA_LABELS[type]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="badge-threshold">Threshold</Label>
              <Input
                id="badge-threshold"
                type="number"
                min="1"
                placeholder="e.g. 10"
                value={form.threshold}
                onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="badge-description">Description</Label>
              <Textarea
                id="badge-description"
                placeholder="Describe what this badge represents..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={closeForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  {isEditing ? 'Update' : 'Create'}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Badge list */}
      {isLoading ? (
        <InlineLoading message="Loading badges..." />
      ) : badges.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">
          No badges defined yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {badges.map(badge => (
            <div
              key={badge.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex-shrink-0 p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
                  {CRITERIA_ICONS[criteriaToForm(badge.criteria).type]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{badge.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{badge.description}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Criteria: {getCriteriaDescription(badge.criteria)}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(badge)}
                  disabled={deleteMutation.isPending}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(badge.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Badge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this badge? Players who have already earned it will keep it, but it will no longer be awarded to new players. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
