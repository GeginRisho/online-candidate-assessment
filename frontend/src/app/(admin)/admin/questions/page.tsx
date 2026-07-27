'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Upload,
  HelpCircle,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestionsExcel,
} from '@/services';
import { parseQuestionOptions, parseCorrectAnswer } from '@/utils/questionUtils';

export default function QuestionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = React.useState<string>('ALL');
  const [filterFormat, setFilterFormat] = React.useState<string>('ALL');

  // Modal control states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [editingQuestion, setEditingQuestion] = React.useState<any>(null);

  // Form states for creating/editing questions
  const [qType, setQType] = React.useState<'APTITUDE' | 'TECHNICAL'>('TECHNICAL');
  const [qFormat, setQFormat] = React.useState<any>('MCQ_SINGLE');
  const [qDifficulty, setQDifficulty] = React.useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [qDomain, setQDomain] = React.useState('');
  const [qTopic, setQTopic] = React.useState('');
  const [qText, setQText] = React.useState('');
  const [qCodeSnippet, setQCodeSnippet] = React.useState('');
  const [qExplanation, setQExplanation] = React.useState('');
  const [qMarks, setQMarks] = React.useState(1);
  const [qNegMarks, setQNegMarks] = React.useState(0);
  const [qTags, setQTags] = React.useState('');

  // Option states for MCQs
  const [optA, setOptA] = React.useState('');
  const [optB, setOptB] = React.useState('');
  const [optC, setOptC] = React.useState('');
  const [optD, setOptD] = React.useState('');
  const [correctMCQ, setCorrectMCQ] = React.useState<string[]>([]); // for MCQ_MULTIPLE or MCQ_SINGLE

  const [excelFile, setExcelFile] = React.useState<File | null>(null);

  // Fetch Questions
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions', filterType, filterDifficulty, filterFormat, search],
    queryFn: () =>
      fetchQuestions({
        type: filterType !== 'ALL' ? (filterType as any) : undefined,
        difficulty: filterDifficulty !== 'ALL' ? (filterDifficulty as any) : undefined,
        format: filterFormat !== 'ALL' ? (filterFormat as any) : undefined,
        search: search || undefined,
      }),
  });

  // Create Question Mutation
  const createMutation = useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      toast.success('Question added to database');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (err: any) => {
      toast.error('Failed to create question', {
        description: err.response?.data?.message || 'Check your fields and try again.',
      });
    },
  });

  // Edit Question Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateQuestion(id, payload),
    onSuccess: () => {
      toast.success('Question updated successfully');
      setEditingQuestion(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update question', {
        description: err.response?.data?.message || 'Check your fields and try again.',
      });
    },
  });

  // Delete Question Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      toast.success('Question removed');
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (err: any) => {
      toast.error('Failed to delete question', {
        description: err.response?.data?.message || 'Please try again later.',
      });
    },
  });

  // Excel Import Mutation
  const excelMutation = useMutation({
    mutationFn: importQuestionsExcel,
    onSuccess: (data) => {
      toast.success('Excel import complete', { description: data.message });
      setIsImportOpen(false);
      setExcelFile(null);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (err: any) => {
      toast.error('Failed to parse Excel file', {
        description: err.response?.data?.message || 'Verify column order meets the guidelines.',
      });
    },
  });

  const resetForm = () => {
    setQType('TECHNICAL');
    setQFormat('MCQ_SINGLE');
    setQDifficulty('MEDIUM');
    setQDomain('');
    setQTopic('');
    setQText('');
    setQCodeSnippet('');
    setQExplanation('');
    setQMarks(1);
    setQNegMarks(0);
    setQTags('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectMCQ([]);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let options = null;
    let correctAnswer: any = [];

    if (qFormat === 'MCQ_SINGLE' || qFormat === 'MCQ_MULTIPLE') {
      options = [
        { id: 'A', text: optA },
        { id: 'B', text: optB },
        { id: 'C', text: optC },
        { id: 'D', text: optD },
      ].filter((o) => o.text !== '');

      correctAnswer = correctMCQ;
    } else if (qFormat === 'TRUE_FALSE') {
      options = [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ];
      correctAnswer = correctMCQ;
    } else {
      correctAnswer = [correctMCQ[0] || ''];
    }

    const payload = {
      type: qType,
      format: qFormat,
      difficulty: qDifficulty,
      domain: qDomain,
      topic: qTopic || null,
      text: qText,
      codeSnippet: qCodeSnippet || null,
      options,
      correctAnswer,
      explanation: qExplanation || null,
      marks: qMarks,
      negativeMarks: qNegMarks,
      timeLimitSec: null,
      tags: qTags ? qTags.split(',').map((t) => t.trim()) : [],
      isActive: true,
    };

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEditClick = (q: any) => {
    setEditingQuestion(q);
    setQType(q.type);
    setQFormat(q.format);
    setQDifficulty(q.difficulty);
    setQDomain(q.domain);
    setQTopic(q.topic || '');
    setQText(q.text);
    setQCodeSnippet(q.codeSnippet || '');
    setQExplanation(q.explanation || '');
    setQMarks(q.marks);
    setQNegMarks(q.negativeMarks);
    setQTags(q.tags.join(', '));

    const opts = parseQuestionOptions(q.options);
    if (opts.length > 0) {
      const a = opts.find((o: any) => o.id === 'A' || o.id === 'true')?.text || '';
      const b = opts.find((o: any) => o.id === 'B' || o.id === 'false')?.text || '';
      const c = opts.find((o: any) => o.id === 'C')?.text || '';
      const d = opts.find((o: any) => o.id === 'D')?.text || '';
      setOptA(a);
      setOptB(b);
      setOptC(c);
      setOptD(d);
    }
    const correctArr = parseCorrectAnswer(q.correctAnswer);
    setCorrectMCQ(correctArr);
    setIsCreateOpen(true);
  };

  const handleExcelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return;
    excelMutation.mutate(excelFile);
  };

  const toggleMCQSelection = (id: string) => {
    if (qFormat === 'MCQ_SINGLE' || qFormat === 'TRUE_FALSE') {
      setCorrectMCQ([id]);
    } else {
      setCorrectMCQ((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            Build and manage reusable question folders for candidate rounds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setIsImportOpen(true)}>
            <Upload className="size-4" />
            <span>Excel Upload</span>
          </Button>
          <Button className="gap-2" onClick={() => { resetForm(); setEditingQuestion(null); setIsCreateOpen(true); }}>
            <Plus className="size-4" />
            <span>Add Question</span>
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label>Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full h-10 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Round Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full h-10 rounded-lg mt-2">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="APTITUDE">Aptitude</SelectItem>
                  <SelectItem value="TECHNICAL">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="w-full h-10 rounded-lg mt-2">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="ALL">All difficulties</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={filterFormat} onValueChange={setFilterFormat}>
                <SelectTrigger className="w-full h-10 rounded-lg mt-2">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="ALL">All formats</SelectItem>
                  <SelectItem value="MCQ_SINGLE">Single Choice (MCQ)</SelectItem>
                  <SelectItem value="MCQ_MULTIPLE">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                  <SelectItem value="CODING">Codinground</SelectItem>
                  <SelectItem value="DESCRIPTIVE">Descriptive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions list */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
          <HelpCircle className="size-12 text-muted-foreground/60 mb-4" />
          <CardTitle className="text-lg">No Questions Found</CardTitle>
          <CardDescription className="max-w-xs mt-2">
            No questions match your filter query. Create a new question or import a sheet to get started.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4">
          {questions.map((q: any) => (
            <Card key={q.id} className="relative overflow-hidden border-border/80">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                        {q.type}
                      </span>
                      <span className="bg-secondary text-secondary-foreground font-medium px-2 py-0.5 rounded capitalize">
                        {q.format.replace('_', ' ').toLowerCase()}
                      </span>
                      <span className="bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded capitalize">
                        {q.difficulty.toLowerCase()}
                      </span>
                      <span className="text-muted-foreground ml-2 truncate">
                        Domain: <strong>{q.domain}</strong>
                      </span>
                      {q.topic && (
                        <span className="text-muted-foreground truncate">
                          · Topic: <strong>{q.topic}</strong>
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-lg leading-snug">{q.text}</h3>

                    {q.codeSnippet && (
                      <pre className="p-3 bg-secondary/50 rounded font-mono text-xs overflow-x-auto border border-border/30 max-h-40">
                        <code>{q.codeSnippet}</code>
                      </pre>
                    )}

                    {(() => {
                      const opts = parseQuestionOptions(q.options);
                      if (opts.length === 0) return null;
                      const correctArr = parseCorrectAnswer(q.correctAnswer);
                      return (
                        <div className="grid gap-2 sm:grid-cols-2 mt-2">
                          {opts.map((opt: any) => {
                            const isCorrect = correctArr.includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2 p-2 border rounded text-sm ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-background border-border/50'
                                }`}
                              >
                                <span className="font-bold text-xs">{opt.id}.</span>
                                <span className="flex-1 truncate">{opt.text}</span>
                                {isCorrect && <CheckCircle className="size-4 text-emerald-500 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(q)}>
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm('Delete this question permanently?')) {
                          deleteMutation.mutate(q.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Question Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</DialogTitle>
              <DialogDescription>
                Define your exam question fields below. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={qType} onValueChange={(val: any) => setQType(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TECHNICAL">Technical</SelectItem>
                      <SelectItem value="APTITUDE">Aptitude</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Format *</Label>
                  <Select value={qFormat} onValueChange={(val: any) => setQFormat(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ_SINGLE">Single Choice (MCQ)</SelectItem>
                      <SelectItem value="MCQ_MULTIPLE">Multiple Choice (MCQ)</SelectItem>
                      <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                      <SelectItem value="CODING">Codinground</SelectItem>
                      <SelectItem value="DESCRIPTIVE">Descriptive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty *</Label>
                  <Select value={qDifficulty} onValueChange={(val: any) => setQDifficulty(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Domain / Subject *</Label>
                  <Input
                    placeholder="e.g. Java, Algebra"
                    value={qDomain}
                    onChange={(e) => setQDomain(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question Topic</Label>
                <Input
                  placeholder="e.g. Loops, Ratios"
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Question Text *</Label>
                <textarea
                  className="w-full min-h-20 rounded border border-input bg-background p-2 text-sm focus:outline-none"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Code Snippet (Optional)</Label>
                <textarea
                  className="w-full min-h-20 rounded border border-input bg-background p-2 font-mono text-xs focus:outline-none"
                  value={qCodeSnippet}
                  onChange={(e) => setQCodeSnippet(e.target.value)}
                />
              </div>

              {/* MCQ Options forms */}
              {(qFormat === 'MCQ_SINGLE' || qFormat === 'MCQ_MULTIPLE') && (
                <div className="space-y-4 border rounded p-4 bg-muted/10">
                  <h4 className="font-semibold text-sm">MCQ Options *</h4>
                  <div className="grid gap-3">
                    {['A', 'B', 'C', 'D'].map((char) => {
                      const val = char === 'A' ? optA : char === 'B' ? optB : char === 'C' ? optC : optD;
                      const setVal = char === 'A' ? setOptA : char === 'B' ? setOptB : char === 'C' ? setOptC : setOptD;
                      const isCorrect = correctMCQ.includes(char);

                      return (
                        <div key={char} className="flex items-center gap-3">
                          <Label className="w-6 text-center">{char}.</Label>
                          <Input
                            placeholder={`Enter Option ${char}`}
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            required={char === 'A' || char === 'B'}
                          />
                          <Checkbox
                            checked={isCorrect}
                            onCheckedChange={() => toggleMCQSelection(char)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {qFormat === 'TRUE_FALSE' && (
                <div className="space-y-2 border rounded p-4 bg-muted/10">
                  <Label>True/False Correct Answer *</Label>
                  <div className="flex gap-4 mt-2">
                    <Button
                      type="button"
                      variant={correctMCQ.includes('true') ? 'default' : 'outline'}
                      onClick={() => setCorrectMCQ(['true'])}
                    >
                      True
                    </Button>
                    <Button
                      type="button"
                      variant={correctMCQ.includes('false') ? 'default' : 'outline'}
                      onClick={() => setCorrectMCQ(['false'])}
                    >
                      False
                    </Button>
                  </div>
                </div>
              )}

              {(qFormat === 'CODING' || qFormat === 'DESCRIPTIVE') && (
                <div className="space-y-2">
                  <Label>Expected Output / Key Criteria Answers *</Label>
                  <textarea
                    className="w-full min-h-16 rounded border border-input bg-background p-2 text-sm focus:outline-none"
                    value={correctMCQ[0] || ''}
                    onChange={(e) => setCorrectMCQ([e.target.value])}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marks Awarded *</Label>
                  <Input
                    type="number"
                    value={qMarks}
                    onChange={(e) => setQMarks(parseInt(e.target.value) || 1)}
                    min={1}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Negative Marks</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={qNegMarks}
                    onChange={(e) => setQNegMarks(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Explanation (Shown in reports)</Label>
                <textarea
                  className="w-full min-h-16 rounded border border-input bg-background p-2 text-sm focus:outline-none"
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags (Comma-separated)</Label>
                <Input
                  placeholder="e.g. java8, streams, logic"
                  value={qTags}
                  onChange={(e) => setQTags(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                Save Question
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <form onSubmit={handleExcelSubmit}>
            <DialogHeader>
              <DialogTitle>Import Excel Sheet</DialogTitle>
              <DialogDescription>
                Upload an Excel workbook matching our questions import specification columns.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
                <FileSpreadsheet className="size-10 text-muted-foreground/60 mb-2" />
                <span className="text-sm font-medium">Select Excel file</span>
                <span className="text-xs text-muted-foreground mt-1">.xlsx format, maximum 5MB</span>
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  id="excel-file-picker"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setExcelFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => document.getElementById('excel-file-picker')?.click()}
                >
                  Browse Files
                </Button>
                {excelFile && (
                  <p className="mt-4 text-xs font-semibold text-emerald-600">
                    Selected: {excelFile.name}
                  </p>
                )}
              </div>

              <div className="text-xs bg-muted/40 p-3 rounded space-y-1">
                <p className="font-semibold">Columns Structure Guideline:</p>
                <p>1. Type (APTITUDE/TECHNICAL) · 2. Format · 3. Domain · 4. Topic · 5. Difficulty</p>
                <p>6. QuestionText · 7. CodeSnippet · 8. Option A · 9. Option B · 10. Option C</p>
                <p>11. Option D · 12. CorrectAnswer (e.g. A,B or true) · 13. Explanation · 14. Marks</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!excelFile} loading={excelMutation.isPending}>
                Import Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
