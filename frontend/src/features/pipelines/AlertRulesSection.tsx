import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, PencilLine, Save, X, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { getRules, createRule, updateRule, deleteRule } from '../../lib/api';
import type { AlertRule, AlertRuleCreate, AlertRuleUpdate } from '../../types/alert_rule';

// ============================================================
// Constants
// ============================================================

const METRIC_OPTIONS = [
  { value: 'z_score', label: 'Z-Score' },
  { value: 'null_pct', label: 'Null %' },
  { value: 'volume_delta_pct', label: 'Volume Delta %' },
];

const OPERATOR_OPTIONS = [
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '\u2265' },
  { value: 'lte', label: '\u2264' },
  { value: 'eq', label: '=' },
];

const METRIC_LABELS: Record<string, string> = {
  z_score: 'Z-Score',
  null_pct: 'Null %',
  volume_delta_pct: 'Volume Delta %',
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: '>',
  lt: '<',
  gte: '\u2265',
  lte: '\u2264',
  eq: '=',
};

// ============================================================
// Types
// ============================================================

interface AlertRulesSectionProps {
  pipelineId: string | undefined;
  isEditing: boolean;
}

interface RuleFormValues {
  metric: 'z_score' | 'null_pct' | 'volume_delta_pct';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: string;
}

function ruleToFormValues(rule: AlertRule): RuleFormValues {
  return {
    metric: rule.metric,
    operator: rule.operator,
    threshold: String(rule.threshold),
  };
}

// ============================================================
// AlertRulesSection
// ============================================================

export function AlertRulesSection({ pipelineId, isEditing }: AlertRulesSectionProps) {
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<RuleFormValues>({
    metric: 'z_score',
    operator: 'gt',
    threshold: '1.0',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // ==========================================================
  // Query: fetch rules
  // ==========================================================
  const {
    data: rules = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['alert-rules', pipelineId],
    queryFn: () => getRules(pipelineId!),
    enabled: !!pipelineId,
  });

  // ==========================================================
  // Mutation: create rule
  // ==========================================================
  const createMutation = useMutation({
    mutationFn: (data: AlertRuleCreate) => createRule(pipelineId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules', pipelineId] });
      setShowAddForm(false);
      resetForm();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  // ==========================================================
  // Mutation: update rule
  // ==========================================================
  const updateMutation = useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: AlertRuleUpdate }) =>
      updateRule(pipelineId!, ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules', pipelineId] });
      setEditingRuleId(null);
      resetForm();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  // ==========================================================
  // Mutation: delete rule (optimistic)
  // ==========================================================
  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => deleteRule(pipelineId!, ruleId),
    onMutate: async (ruleId: string) => {
      await queryClient.cancelQueries({ queryKey: ['alert-rules', pipelineId] });
      const previous = queryClient.getQueryData<AlertRule[]>(['alert-rules', pipelineId]);
      queryClient.setQueryData<AlertRule[]>(
        ['alert-rules', pipelineId],
        (old) => old?.filter((r) => r.id !== ruleId) ?? []
      );
      return { previous };
    },
    onError: (_err, _ruleId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['alert-rules', pipelineId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules', pipelineId] });
    },
  });

  // ==========================================================
  // Form helpers
  // ==========================================================
  function resetForm() {
    setFormValues({ metric: 'z_score', operator: 'gt', threshold: '1.0' });
    setFormError(null);
  }

  function validateForm(): boolean {
    if (!formValues.threshold.trim()) {
      setFormError('Threshold is required');
      return false;
    }
    const num = Number(formValues.threshold);
    if (isNaN(num)) {
      setFormError('Threshold must be a number');
      return false;
    }
    if (num <= 0) {
      setFormError('Threshold must be greater than 0');
      return false;
    }
    setFormError(null);
    return true;
  }

  function handleAddSubmit() {
    if (!validateForm()) return;
    createMutation.mutate({
      metric: formValues.metric,
      operator: formValues.operator,
      threshold: Number(formValues.threshold),
    });
  }

  function handleEditSubmit(ruleId: string) {
    if (!validateForm()) return;
    updateMutation.mutate({
      ruleId,
      data: {
        metric: formValues.metric,
        operator: formValues.operator,
        threshold: Number(formValues.threshold),
      },
    });
  }

  function startEdit(rule: AlertRule) {
    setFormValues(ruleToFormValues(rule));
    setEditingRuleId(rule.id);
    setShowAddForm(false);
    setFormError(null);
  }

  function cancelEdit() {
    setEditingRuleId(null);
    resetForm();
  }

  function cancelAdd() {
    setShowAddForm(false);
    resetForm();
  }

  function getThresholdMin(): number {
    if (formValues.metric === 'volume_delta_pct') return 0;
    return 0.001;
  }

  // ==========================================================
  // Render helpers
  // ==========================================================
  function renderRuleForm(submitLabel: string, onSubmit: () => void, onCancel: () => void) {
    return (
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Select
          label="Metric"
          name="metric"
          value={formValues.metric}
          onChange={(e) =>
            setFormValues({ ...formValues, metric: e.target.value as RuleFormValues['metric'] })
          }
          options={METRIC_OPTIONS}
        />
        <Select
          label="Operator"
          name="operator"
          value={formValues.operator}
          onChange={(e) =>
            setFormValues({
              ...formValues,
              operator: e.target.value as RuleFormValues['operator'],
            })
          }
          options={OPERATOR_OPTIONS}
        />
        <Input
          label="Threshold"
          name="threshold"
          type="number"
          step="0.1"
          min={getThresholdMin()}
          value={formValues.threshold}
          onChange={(e) => setFormValues({ ...formValues, threshold: e.target.value })}
          error={formError ?? undefined}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSubmit}
            loading={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-1" aria-hidden="true" />
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" aria-hidden="true" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // Main render
  // ==========================================================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Alert Rules</h3>
        {isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingRuleId(null);
              resetForm();
              setShowAddForm(true);
            }}
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Add Rule
          </Button>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Save the pipeline first to add rules
          </p>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin w-6 h-6 text-gray-400" aria-label="Loading rules" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
          {(error as Error)?.message || 'Failed to load alert rules'}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && rules.length === 0 && (
        <p className="text-sm text-gray-500 py-4">No alert rules configured yet.</p>
      )}

      {/* Rules list */}
      {!isLoading && !isError && rules.length > 0 && (
        <ul className="space-y-2" role="list">
          {rules.map((rule) => (
            <li key={rule.id}>
              {editingRuleId === rule.id ? (
                renderRuleForm('Save', () => handleEditSubmit(rule.id), cancelEdit)
              ) : (
                <Card className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="info" size="sm">
                      {METRIC_LABELS[rule.metric] || rule.metric}
                    </Badge>
                    <span className="text-sm font-mono text-gray-600">
                      {OPERATOR_LABELS[rule.operator] || rule.operator} {rule.threshold}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(rule)}
                      aria-label={`Edit rule for ${METRIC_LABELS[rule.metric] || rule.metric}`}
                    >
                      <PencilLine className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      loading={deleteMutation.isPending}
                      aria-label={`Delete rule for ${METRIC_LABELS[rule.metric] || rule.metric}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </Card>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Inline add form */}
      {showAddForm &&
        renderRuleForm('Save', handleAddSubmit, cancelAdd)}

      {/* Delete error (mutations already show errors via onError for create/update, delete is optimistic) */}
      {deleteMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
          {(deleteMutation.error as Error)?.message || 'Failed to delete rule'}
        </div>
      )}
    </div>
  );
}
