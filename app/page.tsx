'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowRight,
  Archive,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  CornerUpRight,
  Inbox,
  Lightbulb,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Phase = 'collect' | 'choose' | 'result';
type StuckReason = 'too_big' | 'unclear' | 'low_energy';

const example = [
  '完成季度方案的第一页',
  '回复那封拖了三天的邮件',
  '约一次体检',
  '整理下周的会议材料',
].join('\n');

const durations = [15, 25, 45];
const allowedDurations = [2, ...durations];

function readTasks(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>('collect');
  const [raw, setRaw] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [incumbent, setIncumbent] = useState('');
  const [challengerIndex, setChallengerIndex] = useState(1);
  const [focus, setFocus] = useState('');
  const [backlog, setBacklog] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState('');
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [resumeNote, setResumeNote] = useState('');
  const [pauseDraft, setPauseDraft] = useState('');
  const [interruptedAt, setInterruptedAt] = useState<number | null>(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [completedMessage, setCompletedMessage] = useState('');
  const [sessionEndedAt, setSessionEndedAt] = useState<number | null>(null);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [stuckReason, setStuckReason] = useState<StuckReason | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureDraft, setCaptureDraft] = useState('');
  const deadline = useRef<number | null>(null);

  const parsedTasks = useMemo(() => readTasks(raw), [raw]);
  const challenger = tasks[challengerIndex] ?? '';
  const resumeDisplay = resumeNote || (interruptedAt ? nextAction : '');
  const stuckSuggestion = useMemo(() => {
    if (!stuckReason) return '';
    const shortFocus = focus.length > 48 ? `${focus.slice(0, 48)}…` : focus;
    if (stuckReason === 'too_big') {
      return `先打开与“${shortFocus}”有关的材料，只处理第一个看得见的位置。`;
    }
    if (stuckReason === 'unclear') {
      return `写下完成“${shortFocus}”前，最需要回答的一个问题。`;
    }
    return `只做两分钟：把“${shortFocus}”需要的东西打开并摆到手边。`;
  }, [focus, stuckReason]);

  const markSessionEnded = useCallback(() => {
    deadline.current = null;
    setSecondsLeft(0);
    setRunning(false);
    setSessionEndedAt(Date.now());
  }, []);

  const markComplete = useCallback(() => {
    if (!focus || completedAt) return;
    deadline.current = null;
    setSecondsLeft(0);
    setRunning(false);
    setPauseDialogOpen(false);
    setPauseDraft('');
    setInterruptedAt(null);
    setResumeNote('');
    setSessionEndedAt(null);
    setStuckOpen(false);
    setCaptureOpen(false);
    setRaw(backlog.join('\n'));
    setCompletedAt(Date.now());
    setCompletedMessage(nextAction.trim() || '这一步已经完成，做得很好。');
  }, [backlog, completedAt, focus, nextAction]);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil(((deadline.current ?? Date.now()) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        deadline.current = null;
        setRunning(false);
        markSessionEnded();
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [markSessionEnded, running]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('one-thing-focus') ?? 'null');
      if (saved && typeof saved === 'object') {
        if (typeof saved.raw === 'string') setRaw(saved.raw.slice(0, 500));
        if (typeof saved.focus === 'string' && saved.focus.trim()) {
          setFocus(saved.focus.slice(0, 500));
          setBacklog(Array.isArray(saved.backlog)
            ? saved.backlog.filter((item: unknown): item is string => typeof item === 'string').slice(0, 7)
            : []);
          setNextAction(typeof saved.nextAction === 'string' ? saved.nextAction.slice(0, 200) : '');
          setResumeNote(typeof saved.resumeNote === 'string' ? saved.resumeNote.slice(0, 200) : '');
          setInterruptedAt(typeof saved.interruptedAt === 'number' && Number.isFinite(saved.interruptedAt)
            ? saved.interruptedAt : null);
          setCompletedAt(typeof saved.completedAt === 'number' && Number.isFinite(saved.completedAt)
            ? saved.completedAt : null);
          setCompletedMessage(typeof saved.completedMessage === 'string' ? saved.completedMessage.slice(0, 200) : '');
          setSessionEndedAt(typeof saved.sessionEndedAt === 'number' && Number.isFinite(saved.sessionEndedAt)
            ? saved.sessionEndedAt : null);
          setPauseDraft(typeof saved.pauseDraft === 'string' ? saved.pauseDraft.slice(0, 200) : '');
          setPauseDialogOpen(Boolean(saved.pauseDialogOpen));
          setStuckOpen(Boolean(saved.stuckOpen));
          setStuckReason(['too_big', 'unclear', 'low_energy'].includes(saved.stuckReason)
            ? saved.stuckReason as StuckReason : null);
          setCaptureOpen(Boolean(saved.captureOpen));
          setCaptureDraft(typeof saved.captureDraft === 'string' ? saved.captureDraft.slice(0, 200) : '');
          setPhase('result');
          const duration = allowedDurations.includes(saved.minutes) ? saved.minutes : 25;
          setMinutes(duration);
          const remaining = typeof saved.secondsLeft === 'number' && Number.isFinite(saved.secondsLeft)
            ? Math.max(0, Math.min(duration * 60, saved.secondsLeft)) : duration * 60;
          if (!saved.completedAt && typeof saved.deadline === 'number' && Number.isFinite(saved.deadline)) {
            const left = Math.max(0, Math.min(duration * 60, Math.ceil((saved.deadline - Date.now()) / 1000)));
            setSecondsLeft(left);
            deadline.current = left > 0 ? Date.now() + left * 1000 : null;
            setRunning(left > 0);
            if (left === 0) setSessionEndedAt(Date.now());
          } else setSecondsLeft(remaining);
        }
      }
    } catch { setStorageAvailable(false); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem('one-thing-focus', JSON.stringify({
        version: 4, raw, focus, backlog, nextAction, minutes, secondsLeft,
        resumeNote, pauseDraft, pauseDialogOpen, interruptedAt, completedAt, completedMessage,
        sessionEndedAt, stuckOpen, stuckReason, captureOpen, captureDraft,
        deadline: running ? deadline.current : null,
      }));
    } catch { setStorageAvailable(false); }
  }, [ready, raw, focus, backlog, nextAction, minutes, secondsLeft, resumeNote, pauseDraft,
    pauseDialogOpen, interruptedAt, completedAt, completedMessage, sessionEndedAt, stuckOpen,
    stuckReason, captureOpen, captureDraft, running]);

  const configureFocus = useCallback((task: string, action: string, duration: number, savedBacklog: string[] = []) => {
    deadline.current = null;
    setFocus(task);
    setBacklog(savedBacklog);
    setNextAction(action);
    setMinutes(duration);
    setSecondsLeft(duration * 60);
    setRunning(false);
    setResumeNote('');
    setPauseDraft('');
    setInterruptedAt(null);
    setPauseDialogOpen(false);
    setCompletedAt(null);
    setCompletedMessage('');
    setSessionEndedAt(null);
    setStuckOpen(false);
    setStuckReason(null);
    setCaptureOpen(false);
    setCaptureDraft('');
    setPhase('result');
    setError('');
  }, []);

  useEffect(() => {
    type Tool = {
      name: string; title: string; description: string; inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => object;
    };
    const context = (document as Document & {
      modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> };
    }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: 'configure_focus',
        title: '设置今天的一件事',
        description: '设置用户已选定的事项、第一步和专注时长，打开结果页并重置计时器；不会开始计时。',
        inputSchema: {
          type: 'object', properties: {
            task: { type: 'string', minLength: 1, maxLength: 500 },
            nextAction: { type: 'string', maxLength: 200 },
            minutes: { type: 'integer', enum: [2, 15, 25, 45] },
          }, required: ['task', 'nextAction', 'minutes'], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute(input: unknown) {
          if (!input || typeof input !== 'object') throw new Error('需要事项、第一步和时长。');
          const value = input as Record<string, unknown>;
          if (Object.keys(value).some(key => !['task', 'nextAction', 'minutes'].includes(key)) ||
            typeof value.task !== 'string' || !value.task.trim() || value.task.length > 500 ||
            typeof value.nextAction !== 'string' || value.nextAction.length > 200 ||
            typeof value.minutes !== 'number' || !allowedDurations.includes(value.minutes)) {
            throw new Error('事项须为 1–500 字，第一步最多 200 字，时长为 2、15、25 或 45 分钟。');
          }
          const task = value.task.trim();
          const action = value.nextAction.trim();
          const duration = value.minutes;
          flushSync(() => configureFocus(task, action, duration));
          return { phase: 'result', task, nextAction: action, minutes: duration, running: false };
        },
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* The regular interface remains available. */ }
    return () => lifecycle.abort();
  }, [configureFocus]);

  useEffect(() => {
    if (phase !== 'choose') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"]'))) return;
      if (event.key === '1' || event.key === '2') event.preventDefault();
      if (event.key === '1') choose(incumbent);
      if (event.key === '2') choose(challenger);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function begin() {
    if (parsedTasks.length < 1 || parsedTasks.length > 8) {
      setError(parsedTasks.length > 8 ? '请缩减到 8 件以内；所有输入都会保留。' : '请至少写下一件事。');
      return;
    }

    if (parsedTasks.length === 1) {
      configureFocus(parsedTasks[0], '', minutes);
      return;
    }

    setTasks(parsedTasks);
    setIncumbent(parsedTasks[0]);
    setChallengerIndex(1);
    setError('');
    setPhase('choose');
  }

  function choose(selected: string) {
    const isLastChoice = challengerIndex >= tasks.length - 1;
    if (isLastChoice) {
      configureFocus(selected, '', minutes, tasks.filter((task) => task !== selected));
      return;
    }

    setIncumbent(selected);
    setChallengerIndex((current) => current + 1);
  }

  function reset() {
    deadline.current = null;
    if (phase === 'result' && focus && !completedAt) {
      setRaw([focus, ...backlog].join('\n'));
    }
    setPhase('collect');
    setTasks([]);
    setIncumbent('');
    setFocus('');
    setBacklog([]);
    setNextAction('');
    setRunning(false);
    setSecondsLeft(minutes * 60);
    setResumeNote('');
    setPauseDraft('');
    setInterruptedAt(null);
    setPauseDialogOpen(false);
    setCompletedAt(null);
    setCompletedMessage('');
    setSessionEndedAt(null);
    setStuckOpen(false);
    setStuckReason(null);
    setCaptureOpen(false);
    setCaptureDraft('');
    setError('');
  }

  function startFresh() {
    reset();
    setRaw('');
  }

  function selectDuration(value: number) {
    deadline.current = null;
    setMinutes(value);
    setSecondsLeft(value * 60);
    setRunning(false);
    setSessionEndedAt(null);
    setCompletedAt(null);
    setCompletedMessage('');
  }

  function startTimer(duration = minutes) {
    const remaining = duration !== minutes || secondsLeft === 0 ? duration * 60 : secondsLeft;
    const hasResumeContext = Boolean(interruptedAt || resumeNote);
    if (duration !== minutes) setMinutes(duration);
    deadline.current = Date.now() + remaining * 1000;
    setSecondsLeft(remaining);
    if (!hasResumeContext) setResumeNote('');
    setPauseDialogOpen(false);
    setSessionEndedAt(null);
    setStuckOpen(false);
    setRunning(true);
  }

  function pauseTimer() {
    const remaining = Math.max(0, Math.ceil(((deadline.current ?? Date.now()) - Date.now()) / 1000));
    setSecondsLeft(remaining);
    deadline.current = null;
    setRunning(false);
    setInterruptedAt(Date.now());
    setPauseDraft('');
    setPauseDialogOpen(true);
    setSessionEndedAt(null);
    setStuckOpen(false);
    setCaptureOpen(false);
  }

  function saveInterruption() {
    setResumeNote(pauseDraft.trim() || nextAction.trim());
    setPauseDialogOpen(false);
  }

  function pauseAfterSession() {
    setSessionEndedAt(null);
    setInterruptedAt(Date.now());
    setPauseDraft(resumeNote || nextAction);
    setPauseDialogOpen(true);
  }

  function useStuckSuggestion() {
    if (!stuckSuggestion) return;
    setNextAction(stuckSuggestion.slice(0, 200));
    setStuckOpen(false);
    setStuckReason(null);
    if (!running) startTimer(2);
  }

  function captureThought() {
    const thought = captureDraft.trim();
    if (!thought || backlog.length >= 7) return;
    if (thought !== focus && !backlog.includes(thought)) {
      setBacklog((current) => [...current, thought]);
    }
    setCaptureDraft('');
    setCaptureOpen(false);
  }

  function takeNext(task: string) {
    configureFocus(task, '', minutes, backlog.filter((item) => item !== task));
  }

  function revisitBacklog() {
    const allTasks = (completedAt ? backlog : [focus, ...backlog]).filter(Boolean);
    if (allTasks.length === 0) {
      startFresh();
      return;
    }
    setRaw(allTasks.join('\n'));
    setPhase('collect');
    setTasks([]);
    setIncumbent('');
    setFocus('');
    setBacklog([]);
    setNextAction('');
    setRunning(false);
    setResumeNote('');
    setInterruptedAt(null);
    setPauseDialogOpen(false);
    setCompletedAt(null);
    setCompletedMessage('');
    setSessionEndedAt(null);
    setStuckOpen(false);
    setStuckReason(null);
    setCaptureOpen(false);
    setCaptureDraft('');
    deadline.current = null;
  }

  const timerText = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60,
  ).padStart(2, '0')}`;

  return (
    <main className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div className="paper-grid absolute inset-0" aria-hidden="true" />
      <div
        className="absolute -right-24 top-28 h-72 w-72 rounded-full bg-accent/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-svh w-full max-w-[1180px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10">
        <header className="flex items-center justify-between border-b border-foreground/15 pb-4">
          <a href="#top" className="group flex items-center gap-3" aria-label="壹件首页">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition-transform group-hover:-rotate-6">
              壹
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.18em]">壹件</span>
              <span className="block text-xs uppercase tracking-[0.1em] text-muted-foreground">
                One thing only
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-[#2cbd6b] shadow-[0_0_0_4px_rgb(44_189_107/12%)]" />
            {storageAvailable ? '仅保存在此浏览器' : '当前浏览器无法保存'}
          </div>
        </header>

        <section
          id="top"
          className="grid flex-1 items-center gap-7 py-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14 lg:py-12"
        >
          <div className="max-w-md">
            <div className="mb-5 hidden items-center gap-2 text-sm font-semibold tracking-[0.12em] text-primary lg:flex">
              <Sparkles className="size-4" />
              少一点选择，多一点完成
            </div>
            <h1 className="font-display text-3xl leading-snug tracking-tight sm:text-4xl lg:text-5xl">
              今天，
              <br className="hidden lg:block" />
              <span className="relative inline-block italic">
                只做一件。
                <span className="absolute -bottom-2 left-1 -z-10 h-3 w-[96%] -rotate-1 rounded-full bg-accent/75" />
              </span>
            </h1>
            <p className="mt-6 hidden max-w-sm text-base leading-7 text-muted-foreground lg:block">
              写下待办，选出你今天最想推进的一件事。再给它一个专注时段。
            </p>

            <div className="mt-9 hidden space-y-3 text-sm lg:block">
              {['写下脑中的事', '两两做出选择', '马上开始第一步'].map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full border border-foreground/20 font-mono text-xs">
                    0{index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -inset-3 translate-x-3 translate-y-3 rounded-[2rem] border-2 border-foreground/70 bg-accent/70"
              aria-hidden="true"
            />
            <div className="relative min-h-[520px] rounded-[2rem] border-2 border-foreground/80 bg-card p-5 shadow-[0_28px_90px_rgb(52_39_32/12%)] sm:p-8">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {phase === 'collect' && 'Step 01 / Capture'}
                    {phase === 'choose' && 'Step 02 / Decide'}
                    {phase === 'result' && (completedAt ? 'Step 03 / Complete' : sessionEndedAt ? 'Step 03 / Check in' : 'Step 03 / Begin')}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl" aria-live="polite">
                    {phase === 'collect' && '先把脑子清空'}
                    {phase === 'choose' && '相信第一反应'}
                    {phase === 'result' && (completedAt ? '这一件完成了' : sessionEndedAt ? '这一轮结束了' : '答案已经很清楚')}
                  </h2>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-foreground/15 bg-background font-mono text-xs">
                  {phase === 'collect' ? '01' : phase === 'choose' ? '02' : '03'}
                </span>
              </div>

              {phase === 'collect' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <label htmlFor="tasks" className="mb-2 block text-sm font-semibold">
                    现在占据你注意力的，有哪些事？
                  </label>
                  <Textarea
                    id="tasks"
                    disabled={!ready}
                    aria-invalid={Boolean(error)}
                    aria-describedby="task-error"
                    value={raw}
                    onChange={(event) => {
                      setRaw(event.target.value);
                      setError('');
                    }}
                    placeholder={'一行写一件，例如：\n完成提案的第一页\n预约一次体检\n回复那封重要邮件'}
                    className="min-h-60 resize-none rounded-2xl border-foreground/20 bg-background/70 p-4 text-base leading-7 shadow-inner placeholder:leading-7 focus-visible:border-primary focus-visible:ring-primary/15"
                    maxLength={500}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>一件直接开始，多件两两选择 · {parsedTasks.length}/8 件</span>
                    <Button
                      type="button"
                      variant="link"
                      disabled={!ready}
                      className="min-h-10 px-0"
                      onClick={() => setRaw(example)}
                    >
                      装入示例
                    </Button>
                  </div>
                  <div className="mt-7 flex items-center justify-between gap-4">
                    <output id="task-error" className="min-h-5 text-sm font-medium text-destructive" aria-live="polite">
                      {error}
                    </output>
                    <Button
                      type="button"
                      size="lg"
                      className="h-12 rounded-full px-6 shadow-[0_6px_0_rgb(34_24_58/18%)] active:translate-y-1 active:shadow-none"
                      onClick={begin}
                      disabled={!ready}
                    >
                      {parsedTasks.length === 1 ? '开始这一件' : '开始筛选'}
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </div>
                </div>
              )}

              {phase === 'choose' && (
                <div className="animate-in fade-in slide-in-from-right-3 duration-400">
                  <div className="mb-7 flex gap-1.5" aria-label={`第 ${challengerIndex} 次选择，共 ${tasks.length - 1} 次`}>
                    {Array.from({ length: tasks.length - 1 }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          index < challengerIndex ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mb-4 text-sm leading-6 text-muted-foreground">
                    如果今天只能推进一个，你会选哪个？别分析，选让你更踏实的那个。
                  </p>
                  <div className="grid gap-3">
                    {[incumbent, challenger].map((task, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        onClick={() => choose(task)}
                        className="group h-auto min-h-28 justify-between rounded-2xl border-foreground/20 bg-background/65 px-5 py-4 text-left text-base font-semibold whitespace-normal hover:border-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        <span className="pr-4 leading-6">{task}</span>
                        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-current/20 font-mono text-xs">
                          {index + 1}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <span className="hidden text-sm text-muted-foreground sm:block">
                      也可以按键盘 1 或 2
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={reset}>
                      <RotateCcw data-icon="inline-start" />
                      重新输入
                    </Button>
                  </div>
                </div>
              )}

              {phase === 'result' && (
                <div className="animate-in zoom-in-95 fade-in duration-500">
                  <div className="rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/65">
                      <Check className="size-4" />
                      Today&apos;s one thing
                    </div>
                    <p className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                      {focus}
                    </p>
                  </div>

                  {completedAt && (
                    <section className="mt-4 rounded-2xl border-2 border-primary/25 bg-primary/5 p-5" aria-labelledby="completed-title">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 id="completed-title" className="font-display text-2xl font-semibold">这一件，完成。</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{completedMessage}</p>
                        </div>
                      </div>
                      {backlog.length > 0 ? (
                        <div className="mt-5 border-t border-primary/15 pt-4">
                          <p className="text-sm font-semibold">下一件可以继续：</p>
                          <Button
                            type="button"
                            size="lg"
                            className="mt-3 h-auto min-h-12 w-full justify-between rounded-xl px-4 py-3 text-left whitespace-normal"
                            onClick={() => takeNext(backlog[0])}
                          >
                            <span className="pr-3">{backlog[0]}</span>
                            <ArrowRight data-icon="inline-end" className="shrink-0" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={revisitBacklog}>
                            <CornerUpRight data-icon="inline-start" />
                            重新比较暂存事项
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" className="mt-5 rounded-full" onClick={startFresh}>
                          再做一组事情
                          <ArrowRight data-icon="inline-end" />
                        </Button>
                      )}
                    </section>
                  )}

                  {!completedAt && sessionEndedAt && (
                    <section className="mt-4 rounded-2xl border-2 border-accent bg-accent/15 p-5" aria-labelledby="session-ended-title">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-foreground">
                          <Clock3 className="size-5" />
                        </span>
                        <div>
                          <h3 id="session-ended-title" className="font-display text-2xl font-semibold">这一轮结束了</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            计时结束不代表事情已经完成。看看此刻最合适的下一步。
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-2 sm:grid-cols-3">
                        <Button type="button" className="h-auto min-h-11 rounded-xl whitespace-normal" onClick={() => startTimer(minutes === 2 ? 15 : minutes)}>
                          <Play data-icon="inline-start" className="fill-current" />
                          {minutes === 2 ? '继续 15 分钟' : `再继续 ${minutes} 分钟`}
                        </Button>
                        <Button type="button" variant="outline" className="h-auto min-h-11 rounded-xl whitespace-normal" onClick={pauseAfterSession}>
                          <CornerUpRight data-icon="inline-start" />
                          先停在这里
                        </Button>
                        <Button type="button" variant="ghost" className="h-auto min-h-11 rounded-xl whitespace-normal" onClick={markComplete}>
                          <Check data-icon="inline-start" />
                          任务完成
                        </Button>
                      </div>
                    </section>
                  )}

                  {!completedAt && backlog.length > 0 && (
                    <details className="group mt-4">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-foreground/15 bg-background/65 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2">
                          <Archive className="size-4 text-primary" />
                          其余 {backlog.length} 件已收进稍后
                        </span>
                        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="px-2 pt-3">
                        <ul className="space-y-2" aria-label="稍后处理的事项">
                          {backlog.map((task) => (
                            <li key={task} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={revisitBacklog}>
                          <CornerUpRight data-icon="inline-start" />
                          带回清单，重新选择
                        </Button>
                      </div>
                    </details>
                  )}

                  {!completedAt && <div className="mt-6">
                    <label htmlFor="next-action" className="mb-2 block text-sm font-semibold">
                      把它缩小：你能立刻做的第一步是什么？
                    </label>
                    <Input
                      id="next-action"
                      maxLength={200}
                      value={nextAction}
                      onChange={(event) => setNextAction(event.target.value)}
                      placeholder="例如：打开文档，写下第一句"
                      className="h-12 rounded-xl border-foreground/20 bg-background/65 px-4 text-base focus-visible:border-primary focus-visible:ring-primary/15"
                    />
                  </div>}

                  {!completedAt && !sessionEndedAt && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 justify-start rounded-xl border-foreground/15 bg-background/55"
                        aria-expanded={stuckOpen}
                        onClick={() => {
                          setStuckOpen((current) => !current);
                          setCaptureOpen(false);
                        }}
                      >
                        <Lightbulb data-icon="inline-start" />
                        我卡住了
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 justify-start rounded-xl border-foreground/15 bg-background/55"
                        aria-expanded={captureOpen}
                        onClick={() => {
                          setCaptureOpen((current) => !current);
                          setStuckOpen(false);
                        }}
                      >
                        <Inbox data-icon="inline-start" />
                        先记一下
                      </Button>
                    </div>
                  )}

                  {!completedAt && !sessionEndedAt && stuckOpen && (
                    <section className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-4" aria-labelledby="stuck-title">
                      <h3 id="stuck-title" className="text-sm font-semibold">现在卡在哪里？</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {([
                          ['too_big', '事情太大'],
                          ['unclear', '不知道怎么做'],
                          ['low_energy', '现在没精力'],
                        ] as const).map(([reason, label]) => (
                          <Button
                            key={reason}
                            type="button"
                            size="sm"
                            variant={stuckReason === reason ? 'default' : 'outline'}
                            className="rounded-full"
                            onClick={() => setStuckReason(reason)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                      {stuckSuggestion && (
                        <div className="mt-4 rounded-xl bg-card p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">先做这个</p>
                          <p className="mt-2 text-sm font-semibold leading-6">{stuckSuggestion}</p>
                          <Button type="button" size="sm" className="mt-3 rounded-full" onClick={useStuckSuggestion}>
                            {running ? '用作当前第一步' : '用这个，启动两分钟'}
                            {!running && <Play data-icon="inline-end" className="fill-current" />}
                          </Button>
                        </div>
                      )}
                    </section>
                  )}

                  {!completedAt && !sessionEndedAt && captureOpen && (
                    <section className="mt-3 rounded-2xl border border-accent/70 bg-accent/10 p-4" aria-labelledby="capture-title">
                      <h3 id="capture-title" className="text-sm font-semibold">把突然想到的事收进稍后</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {backlog.length >= 7 ? '稍后已有 7 件，先处理或重新整理一件。' : '当前计时不会停止。'}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={captureDraft}
                          maxLength={200}
                          onChange={(event) => setCaptureDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) captureThought();
                          }}
                          placeholder="例如：下班前回复小林"
                          className="h-11 rounded-xl border-foreground/20 bg-card px-4 text-base"
                          aria-label="记下稍后处理的事"
                        />
                        <Button type="button" className="h-11 rounded-xl" disabled={!captureDraft.trim() || backlog.length >= 7} onClick={captureThought}>
                          <Plus data-icon="inline-start" />
                          {backlog.length >= 7 ? '稍后已满' : '收进稍后'}
                        </Button>
                      </div>
                    </section>
                  )}

                  {!completedAt && !sessionEndedAt && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/70 bg-accent/15 p-3 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-foreground">
                        <Zap className="size-4 fill-current" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">还是难开始？</p>
                        <p className="text-xs text-muted-foreground">先做两分钟，只求启动。</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full border-foreground/20 bg-card px-4"
                      disabled={running || pauseDialogOpen}
                      onClick={() => startTimer(2)}
                    >
                      两分钟启动
                      <Play data-icon="inline-end" className="fill-current" />
                    </Button>
                  </div>}

                  {!completedAt && !sessionEndedAt && <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-sm font-medium text-muted-foreground">专注时长</span>
                    {durations.map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={minutes === value ? 'default' : 'outline'}
                        className="h-10 rounded-full px-3 text-sm"
                        aria-pressed={minutes === value}
                        disabled={running || pauseDialogOpen}
                        onClick={() => selectDuration(value)}
                      >
                        {value} 分钟
                      </Button>
                    ))}
                  </div>}

                  {!completedAt && pauseDialogOpen && (
                    <section className="mt-5 rounded-2xl border-2 border-foreground/70 bg-card p-4 shadow-[6px_6px_0_rgb(239_184_53/55%)]" aria-labelledby="pause-title">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 id="pause-title" className="font-display text-xl font-semibold">给回来后的自己留句话</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">记下做到哪里、下一步是什么。</p>
                        </div>
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/30 text-primary">
                          <CornerUpRight className="size-4" />
                        </span>
                      </div>
                      <label htmlFor="pause-note" className="mt-4 block text-sm font-semibold">我停在这里</label>
                      <Textarea
                        id="pause-note"
                        value={pauseDraft}
                        onChange={(event) => setPauseDraft(event.target.value)}
                        placeholder={nextAction ? `例如：${nextAction}` : '例如：已列好三个要点，下一步给第二点补一个例子'}
                        maxLength={200}
                        className="mt-2 min-h-20 rounded-xl border-foreground/20 bg-background/70 p-3 text-base leading-6 focus-visible:border-primary focus-visible:ring-primary/15"
                        autoFocus
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{pauseDraft.length}/200</span>
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" onClick={() => setPauseDialogOpen(false)}>跳过记录</Button>
                          <Button type="button" onClick={saveInterruption}>保存接回点</Button>
                        </div>
                      </div>
                    </section>
                  )}

                  {!completedAt && !sessionEndedAt && (resumeDisplay || interruptedAt) && !pauseDialogOpen && (
                    <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4" role="status">
                      <div className="flex items-start gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <CornerUpRight className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {interruptedAt
                              ? `${new Date(interruptedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · `
                              : ''}
                            {running ? '正从接回点继续' : '暂停 · 回来从这里接上'}
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold leading-6">
                            {resumeDisplay || '回到刚才的第一步，继续两分钟。'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!completedAt && !sessionEndedAt && <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-foreground/15 bg-background/70 p-3 pl-5">
                    <div className="flex items-center gap-3">
                      <Clock3 className={`size-5 text-primary ${running ? 'animate-pulse' : ''}`} />
                      <div>
                        <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{timerText}</p>
                        <p className="text-xs text-muted-foreground" role="status">
                          {secondsLeft === 0 ? '做到了，休息一下' : running ? '保持在这一件事上' : '准备好就开始'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="h-11 rounded-full px-5"
                      onClick={running ? pauseTimer : () => startTimer()}
                      disabled={pauseDialogOpen}
                    >
                      {running ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" className="fill-current" />}
                      {running ? '暂停' : interruptedAt ? '从这里继续' : secondsLeft === 0 ? '再来一次' : '开始'}
                    </Button>
                  </div>}

                  {!completedAt && !sessionEndedAt && <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={reset}>
                    <RotateCcw data-icon="inline-start" />
                    换一组事情
                  </Button>}
                  {!completedAt && !sessionEndedAt && (
                    <Button type="button" variant="ghost" size="sm" className="mt-2 ml-2 text-primary" onClick={markComplete}>
                      <Check data-icon="inline-start" />
                      标记完成
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/15 pt-4 text-xs tracking-[0.1em] text-muted-foreground">
          <span>Clarity beats intensity.</span>
          <span className="flex items-center gap-2">
            <Circle className="size-2 fill-current" />
            一次，只向前一步
          </span>
        </footer>
      </div>

    </main>
  );
}

