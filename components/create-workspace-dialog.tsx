"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Star,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface TopicSuggestion {
  title: string;
  description: string;
  roles: string;
  coreFeatures: string;
  techStack: string;
  difficulty: number;
}

interface RequirementModule {
  name: string;
  features: string[];
  enabled: boolean;
}

interface ExpandedRequirements {
  summary: string;
  roles: { name: string; description: string }[];
  modules: RequirementModule[];
  tables: string[];
  difficulty: number;
  feasibility: string;
  estimatedPages: number;
  estimatedApis: number;
  estimatedTables: number;
  estimatedWords: number;
}

type Step = "keyword" | "pick-topic" | "tech-stack" | "requirements" | "confirm";
type MajorCategory = "computer" | "non-computer";
type CreationMode = "recommend" | "topic-only" | "topic-with-features";

const majorCategoryLabels: Record<MajorCategory, string> = {
  computer: "计算机相关专业",
  "non-computer": "非计算机专业",
};

const searchHints = [
  "正在检索毕设题目库...",
  "AI 正在分析相关方向...",
  "匹配适合本科难度的选题...",
  "评估各题目可行性...",
  "生成推荐列表...",
];

const requirementHints = [
  "AI 正在分析项目需求...",
  "拆解系统角色与权限...",
  "规划功能模块...",
  "设计数据库表结构...",
  "评估项目复杂度...",
  "生成可行性报告...",
];

type TechOption = { value: string; label: string };

const backendOptions: TechOption[] = [
  { value: "java-springboot", label: "Java + SpringBoot" },
  { value: "nodejs-express", label: "Node.js + Express" },
  { value: "nodejs-koa", label: "Node.js + Koa" },
  { value: "python-fastapi", label: "Python + FastAPI" },
  { value: "python-flask", label: "Python + Flask" },
  { value: "python-django", label: "Python + Django" },
];

const databaseOptions: TechOption[] = [
  { value: "mysql", label: "MySQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mongodb", label: "MongoDB" },
];

const frontendOptions: TechOption[] = [
  { value: "vue3", label: "Vue 3" },
  { value: "react", label: "React" },
];

function getOptionLabel(options: TechOption[], value: string): string {
  return options.find((item) => item.value === value)?.label ?? value;
}

function stripListPrefix(line: string): string {
  return line
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*\d+[\.\)\u3001]\s+/, "")
    .trim();
}

function splitFeatureItems(raw: string): string[] {
  return raw
    .split(/[、，,；;|/]/)
    .map((item) => stripListPrefix(item))
    .filter(Boolean);
}

function pushUniqueFeatures(target: string[], incoming: string[]) {
  for (const item of incoming) {
    if (!target.includes(item)) {
      target.push(item);
    }
  }
}

function buildRequirementsFromManualInput(
  rawText: string,
  topic: string,
  majorCategory: MajorCategory
): ExpandedRequirements {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => stripListPrefix(line))
    .filter(Boolean);

  const modules: RequirementModule[] = [];
  const looseFeatures: string[] = [];
  let currentModule: RequirementModule | null = null;

  for (const line of lines) {
    if (/^角色[:：]/.test(line) || /^数据库[:：]/.test(line)) {
      continue;
    }

    const separatorMatch = line.match(/^(.+?)[：:]\s*(.+)$/);
    if (separatorMatch) {
      const moduleName = separatorMatch[1].replace(/模块$/, "").trim();
      const featureText = separatorMatch[2].trim();
      const features = splitFeatureItems(featureText);

      if (moduleName) {
        const module: RequirementModule = {
          name: moduleName,
          features: [],
          enabled: true,
        };
        if (features.length > 0) {
          pushUniqueFeatures(module.features, features);
        }
        modules.push(module);
        currentModule = module;
        continue;
      }
    }

    const inlineFeatures = splitFeatureItems(line);
    if (inlineFeatures.length > 1) {
      if (currentModule) {
        pushUniqueFeatures(currentModule.features, inlineFeatures);
      } else {
        pushUniqueFeatures(looseFeatures, inlineFeatures);
      }
      continue;
    }

    if (currentModule) {
      pushUniqueFeatures(currentModule.features, [line]);
    } else {
      pushUniqueFeatures(looseFeatures, [line]);
    }
  }

  const normalizedModules = modules
    .map((module) => ({
      ...module,
      features: module.features.filter(Boolean),
    }))
    .filter((module) => module.name && module.features.length > 0);

  if (looseFeatures.length > 0) {
    normalizedModules.push({
      name: "自定义功能清单",
      features: looseFeatures,
      enabled: true,
    });
  }

  if (normalizedModules.length === 0 && lines.length > 0) {
    normalizedModules.push({
      name: "核心功能",
      features: lines.slice(0, 20),
      enabled: true,
    });
  }

  const roleLine = lines.find((line) => /^角色[:：]/.test(line));
  const roleNames =
    roleLine?.split(/[:：]/)[1]?.split(/[、，,；;|/]/).map((item) => item.trim()).filter(Boolean) ?? [];
  const defaultRoles =
    majorCategory === "computer"
      ? [
          { name: "用户", description: "使用系统核心业务功能" },
          { name: "管理员", description: "负责数据、权限与流程管理" },
        ]
      : [
          { name: "业务用户", description: "日常录入、查询和处理业务数据" },
          { name: "管理员", description: "维护系统配置与审核流程" },
        ];
  const roles =
    roleNames.length > 0
      ? roleNames.slice(0, 4).map((name) => ({
          name,
          description: "来自用户提供的角色定义",
        }))
      : defaultRoles;

  const featureCount = normalizedModules.reduce((sum, module) => sum + module.features.length, 0);
  const estimatedTables = Math.max(5, Math.min(20, Math.ceil(featureCount * 0.8)));
  const estimatedApis = Math.max(8, featureCount * 2);
  const estimatedPages = Math.max(6, Math.ceil(featureCount * 0.8));
  const estimatedWords = Math.max(12000, 10000 + featureCount * 400);
  const difficulty = Math.max(2, Math.min(5, Math.round(featureCount / 5) + 2));

  const tableCandidates = ["users", "roles", "logs"];
  const joinedFeatureText = normalizedModules
    .flatMap((module) => [module.name, ...module.features])
    .join(" ")
    .toLowerCase();
  if (/订单|交易|支付/.test(joinedFeatureText)) tableCandidates.push("orders", "payments");
  if (/商品|库存|菜单|图书|课程/.test(joinedFeatureText)) tableCandidates.push("products");
  if (/评价|评论|反馈/.test(joinedFeatureText)) tableCandidates.push("comments");
  if (/通知|消息/.test(joinedFeatureText)) tableCandidates.push("notifications");
  const tables = Array.from(new Set(tableCandidates)).slice(0, estimatedTables);

  return {
    summary: `基于你提供的功能点，已整理为 ${normalizedModules.length} 个模块、${featureCount} 项核心功能。你可以在下一步继续勾选与微调。`,
    roles,
    modules: normalizedModules,
    tables,
    difficulty,
    feasibility: `该方案来自你提供的现成功能清单，适合在「${topic}」基础上直接落地开发与论文撰写。`,
    estimatedPages,
    estimatedApis,
    estimatedTables,
    estimatedWords,
  };
}

export function CreateWorkspaceDialog({ open, onOpenChange, onCreated }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("keyword");
  const [loading, setLoading] = useState(false);
  const [loadingHint, setLoadingHint] = useState("");
  const [error, setError] = useState("");
  const [creationMode, setCreationMode] = useState<CreationMode>("recommend");

  // Step 1: keyword
  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [topicBatch, setTopicBatch] = useState(1);

  // Step 2: topic
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [manualFeatureInput, setManualFeatureInput] = useState("");

  // Step 3: tech stack
  const [majorCategory, setMajorCategory] = useState<MajorCategory>("computer");
  const [backend, setBackend] = useState("java-springboot");
  const [database, setDatabase] = useState("mysql");
  const [frontend, setFrontend] = useState("vue3");
  const [projectName, setProjectName] = useState("");

  // Step 4: requirements
  const [requirements, setRequirements] = useState<ExpandedRequirements | null>(null);

  function reset() {
    setStep("keyword");
    setCreationMode("recommend");
    setKeyword("");
    setSuggestions([]);
    setTopicBatch(1);
    setSelectedTopic("");
    setCustomTopic("");
    setManualFeatureInput("");
    setMajorCategory("computer");
    setBackend("java-springboot");
    setDatabase("mysql");
    setFrontend("vue3");
    setProjectName("");
    setRequirements(null);
    setError("");
    setLoading(false);
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  const finalTopic = customTopic || selectedTopic;
  const isManualFeatureMode = creationMode === "topic-with-features";
  const canProceedFromPickTopic = isManualFeatureMode
    ? Boolean(finalTopic.trim() && manualFeatureInput.trim())
    : Boolean(finalTopic.trim());
  const backendLabel = getOptionLabel(backendOptions, backend);
  const databaseLabel = getOptionLabel(databaseOptions, database);
  const frontendLabel = getOptionLabel(frontendOptions, frontend);
  const selectedTechStackLabel = `${backendLabel} + ${databaseLabel} + ${frontendLabel}`;

  function startHintCycle(hints: string[]) {
    let idx = 0;
    setLoadingHint(hints[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % hints.length;
      setLoadingHint(hints[idx]);
    }, 2500);
    return () => {
      clearInterval(timer);
      setLoadingHint("");
    };
  }

  async function searchTopics(options?: { append?: boolean }) {
    if (!keyword.trim()) return;
    const append = options?.append ?? false;
    if (!append) {
      setCreationMode("recommend");
    }
    const nextBatch = append ? topicBatch + 1 : 1;
    const existingTitles = append ? suggestions.map((item) => item.title) : [];
    setLoading(true);
    setError("");
    const stopHints = startHintCycle(searchHints);
    try {
      const res = await fetch("/api/ai/recommend-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          majorCategory,
          techStack: { backend, database, frontend },
          batch: nextBatch,
          excludeTitles: existingTitles,
        }),
      });
      const data = await res.json();
      const incoming: TopicSuggestion[] = Array.isArray(data?.data) ? data.data : [];
      if (data.success && incoming.length > 0) {
        if (append) {
          const existingSet = new Set(
            suggestions.map((item) => item.title.trim().toLowerCase())
          );
          const newItems = incoming.filter(
            (item) => !existingSet.has(item.title.trim().toLowerCase())
          );

          if (newItems.length === 0) {
            setError("暂时没有更多不同题目了，建议换个关键词再试");
          } else {
            setSuggestions((prev) => [...prev, ...newItems]);
            setTopicBatch(nextBatch);
          }
        } else {
          setSuggestions(incoming);
          setSelectedTopic("");
          setCustomTopic("");
          setTopicBatch(1);
        }
        setStep("pick-topic");
      } else {
        if (append) {
          setError("没有更多推荐了，你可以换个关键词再试");
        } else {
        setError("未获取到推荐题目，请尝试其他关键词或直接输入题目");
        setSuggestions([]);
        setTopicBatch(1);
        setStep("pick-topic");
      }
      }
    } catch {
      setError("请求失败，请重试");
    }
    stopHints();
    setLoading(false);
  }

  async function expandRequirements() {
    setLoading(true);
    setError("");
    const stopHints = startHintCycle(requirementHints);
    try {
      const res = await fetch("/api/ai/expand-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: finalTopic,
          majorCategory,
          techStack: { backend, database, frontend },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRequirements(data.data);
        setStep("requirements");
      } else {
        setError(data.error || "需求生成失败");
      }
    } catch {
      setError("请求失败");
    }
    stopHints();
    setLoading(false);
  }

  async function handleProceedFromTechStack() {
    if (isManualFeatureMode) {
      const manual = manualFeatureInput.trim();
      if (!manual || !finalTopic.trim()) {
        setError("请先填写题目和功能点");
        return;
      }
      setError("");
      const manualRequirements = buildRequirementsFromManualInput(
        manual,
        finalTopic,
        majorCategory
      );
      setRequirements(manualRequirements);
      setStep("requirements");
      return;
    }
    await expandRequirements();
  }

  function toggleModule(index: number) {
    if (!requirements) return;
    const updated = { ...requirements };
    updated.modules = [...updated.modules];
    updated.modules[index] = {
      ...updated.modules[index],
      enabled: !updated.modules[index].enabled,
    };
    setRequirements(updated);
  }

  async function createWorkspace() {
    setLoading(true);
    setError("");
    try {
      const enabledModules = requirements?.modules.filter((m) => m.enabled) || [];
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName || finalTopic,
          topic: finalTopic,
          techStack: { backend, database, frontend },
          requirements: {
            summary: requirements?.summary,
            roles: requirements?.roles,
            modules: enabledModules,
            tables: requirements?.tables,
            majorCategory,
            majorCategoryLabel: majorCategoryLabels[majorCategory],
            requirementSource:
              creationMode === "topic-with-features" ? "manual-features" : "ai-recommend",
            manualFeatureInput:
              creationMode === "topic-with-features" ? manualFeatureInput.trim() : undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        handleOpenChange(false);
        onCreated();
        router.push(`/workspace/${data.data.id}`);
      } else {
        setError(data.error || "创建失败");
      }
    } catch {
      setError("创建失败");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === "keyword" && "选题推荐"}
            {step === "pick-topic" && "选择题目"}
            {step === "tech-stack" && "选择技术栈"}
            {step === "requirements" && "需求确认"}
            {step === "confirm" && "创建确认"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            按步骤创建工作空间：选题、技术栈、需求确认与创建。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Step 1: Keyword Input */}
        {step === "keyword" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              输入业务场景关键词，AI 会按“信息系统/软件类毕设”方向给你推荐选题
            </p>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
              <p className="text-xs text-blue-700">
                当前版本仅开放信息系统/软件工程方向（用户端 + 管理端 + 数据库）。目标检测等算法研究方向将后续新增。
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              <div className="space-y-2">
                <Label>专业分类（用于推荐）</Label>
                <Select
                  value={majorCategory}
                  onValueChange={(value) => setMajorCategory(value as MajorCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="computer">计算机相关专业（推荐）</SelectItem>
                    <SelectItem value="non-computer">非计算机专业</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>技术栈偏好（用于选题推荐）</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">后端技术</Label>
                    <Select value={backend} onValueChange={setBackend}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {backendOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">数据库</Label>
                    <Select value={database} onValueChange={setDatabase}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {databaseOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">前端技术</Label>
                    <Select value={frontend} onValueChange={setFrontend}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frontendOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI 会把关键词 + 你选的技术栈一起检索，避免推荐结果与后续技术栈不一致。
                </p>
                <Badge variant="secondary" className="text-xs">
                  当前推荐技术栈：{selectedTechStackLabel}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="如：外卖运营、校园服务、预约管理、二手交易..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchTopics()}
              />
              <Button onClick={() => void searchTopics()} disabled={loading || !keyword.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {loading && loadingHint && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-700">{loadingHint}</p>
                  <p className="text-xs text-blue-500 mt-0.5">通常需要 10-20 秒，请耐心等待</p>
                </div>
              </div>
            )}
            {!loading && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">或者</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setCreationMode("topic-only");
                      setStep("pick-topic");
                    }}
                  >
                    我已有题目，直接输入
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setCreationMode("topic-with-features");
                      setStep("pick-topic");
                    }}
                  >
                    我已有题目和功能点，直接导入
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Pick Topic */}
        {step === "pick-topic" && (
          <div className="space-y-4">
            {creationMode === "recommend" && suggestions.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  AI 已按信息系统/软件类方向 + 你选择的技术栈推荐题目。选好后下一步会看到完整功能清单，你可以自由增减。
                </p>
                <Badge variant="outline" className="w-fit text-xs">
                  推荐技术栈：{selectedTechStackLabel}
                </Badge>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    已为你推荐 {suggestions.length} 个题目（第 {topicBatch} 批）
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loading || !keyword.trim()}
                    onClick={() => searchTopics({ append: true })}
                  >
                    {loading ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    再来一批
                  </Button>
                </div>
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto overflow-x-hidden pr-2">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors overflow-hidden",
                        selectedTopic === s.title
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        setSelectedTopic(s.title);
                        setCustomTopic("");
                      }}
                    >
                      {selectedTopic === s.title ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.description}
                        </p>
                        {s.roles && (
                          <p className="text-xs mt-1">
                            <span className="text-muted-foreground">角色：</span>
                            <span>{s.roles}</span>
                          </p>
                        )}
                        {s.coreFeatures && (
                          <p className="text-xs mt-0.5">
                            <span className="text-muted-foreground">功能：</span>
                            <span>{s.coreFeatures}</span>
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="max-w-full whitespace-normal break-words text-xs"
                          >
                            {s.techStack}
                          </Badge>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star
                                key={j}
                                className={cn(
                                  "h-3 w-3",
                                  j < s.difficulty
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-200"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {creationMode === "topic-with-features" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                <p className="text-xs text-blue-700">
                  你可以直接粘贴现成的功能清单（模块/角色/功能点），系统会自动整理成可勾选的需求结构，后续仍可继续调整。
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>或自定义题目</Label>
              <Input
                placeholder="如：基于 Vue3 的校园二手交易平台"
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  setSelectedTopic("");
                }}
              />
              <p className="text-xs text-muted-foreground">
                不用担心写得不够完整。若题目偏算法研究，系统会自动转成可交付的信息系统方案供你继续完善。
              </p>
            </div>

            {isManualFeatureMode && (
              <div className="space-y-2">
                <Label>粘贴你的功能点清单（必填）</Label>
                <Textarea
                  placeholder={`示例：\n角色：用户、管理员\n用户模块：注册登录、个人资料、消息通知\n商品模块：发布商品、编辑商品、商品列表、分类筛选\n订单模块：下单、支付、订单状态跟踪、退款申请\n管理模块：用户管理、商品审核、订单管理、公告管理`}
                  value={manualFeatureInput}
                  onChange={(e) => setManualFeatureInput(e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  支持“模块：功能1、功能2”或按行罗列。进入下一步后可继续勾选与微调。
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("keyword")}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回
              </Button>
              <Button
                className="flex-1"
                disabled={!canProceedFromPickTopic}
                onClick={() => setStep("tech-stack")}
              >
                下一步
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Tech Stack */}
        {step === "tech-stack" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">选题：{finalTopic}</p>
            </div>

            {isManualFeatureMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <p className="text-xs text-amber-700">
                  当前为“题目 + 功能点直导”模式：本步完成后将直接生成需求清单，不再调用选题扩展接口。
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>专业分类</Label>
              <Select
                value={majorCategory}
                onValueChange={(value) => setMajorCategory(value as MajorCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="computer">计算机相关专业（推荐）</SelectItem>
                  <SelectItem value="non-computer">非计算机专业</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                当前系统以“信息系统/软件类毕设”最稳定，非计算机专业会自动偏向业务信息化题目。
              </p>
              {majorCategory === "non-computer" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <p className="text-xs text-amber-700">
                    已切换为非计算机专业模式：我们会优先生成更易答辩、工程复杂度更低的系统型方案。
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>项目名称</Label>
              <Input
                placeholder={finalTopic}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                给你的项目起个名字，不填就用选题作为名称
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>选择技术栈</Label>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5 mb-3">
                <p className="text-xs text-blue-700">
                  不确定选什么？先用默认的就行！后续在工作空间里随时可以通过 AI 对话更换技术栈，不影响后面的操作。
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">后端技术</Label>
                  <Select value={backend} onValueChange={setBackend}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {backendOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">数据库</Label>
                  <Select value={database} onValueChange={setDatabase}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {databaseOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">前端技术</Label>
                  <Select value={frontend} onValueChange={setFrontend}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {frontendOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {loading && loadingHint && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-700">{loadingHint}</p>
                  <p className="text-xs text-blue-500 mt-0.5">AI 正在为你规划完整的毕设方案，大约 15-30 秒</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("pick-topic")} disabled={loading}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回
              </Button>
              <Button className="flex-1" onClick={handleProceedFromTechStack} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    下一步：查看功能清单
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Requirements */}
        {step === "requirements" && requirements && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{finalTopic}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {requirements.summary}
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
              <p className="text-xs text-blue-700">
                当前需求已按信息系统/软件类毕设约束生成（角色、模块、数据库、流程），更适合课程答辩与演示。
              </p>
            </div>

            {/* Roles */}
            {requirements.roles?.length > 0 && (
              <div>
                <Label className="mb-2 block">系统角色</Label>
                <div className="flex flex-wrap gap-2">
                  {requirements.roles.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {r.name}: {r.description}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Modules */}
            <div>
              <Label className="mb-2 block">功能模块（点击可取消/启用）</Label>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {requirements.modules?.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm",
                      m.enabled ? "bg-primary/5" : "bg-muted/50 opacity-60"
                    )}
                    onClick={() => toggleModule(i)}
                  >
                    <CheckCircle2
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        m.enabled ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {m.features?.join("、")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "前端页面", value: `~${requirements.estimatedPages || 0}` },
                { label: "后端接口", value: `~${requirements.estimatedApis || 0}` },
                { label: "数据库表", value: `~${requirements.estimatedTables || 0}` },
                { label: "论文字数", value: `~${(requirements.estimatedWords || 0) / 10000}万` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-muted/50 p-2">
                  <p className="text-lg font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Feasibility */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  可行性评估
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                {requirements.feasibility || "完全可行，适合作为毕设项目"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("tech-stack")}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回修改
              </Button>
              <Button
                className="flex-1"
                onClick={createWorkspace}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "确认创建工作空间"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
