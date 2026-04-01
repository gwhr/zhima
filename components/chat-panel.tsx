"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Square } from "lucide-react";
import { ChatMessage } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatPanelProps {
  workspaceId: string;
  files: { id: string; path: string; type: string; size: number }[];
  onFileApplied?: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel({ workspaceId, files, onFileApplied }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch(`/api/workspace/${workspaceId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMessages(
            data.data
              .filter((m: { role: string }) => m.role !== "SYSTEM")
              .map((m: { id: string; role: string; content: string }) => ({
                id: m.id,
                role: m.role === "USER" ? "user" : "assistant",
                content: m.content,
              }))
          );
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const handleStopGeneration = useCallback(() => {
    const controller = abortControllerRef.current;
    if (!controller) return;
    controller.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m, idx) =>
        idx === prev.length - 1 &&
        m.role === "assistant" &&
        m.content.trim().length === 0
          ? { ...m, content: "已暂停本次生成，你可以继续提问或补充需求。" }
          : m
      )
    );
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          workspaceId,
          taskType: "MODIFY_SIMPLE",
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullText } : m
          )
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.content.trim().length === 0
              ? { ...m, content: "已暂停本次生成，你可以继续提问或补充需求。" }
              : m
          )
        );
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "抱歉，AI 响应出错了，请重试。" }
            : m
        )
      );
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-5"
      >
        {messages.length === 0 && (
          <p className="mt-20 text-center text-sm text-muted-foreground">
            开始和 AI 对话，描述你的需求。
          </p>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            workspaceId={workspaceId}
            files={files}
            onFileApplied={onFileApplied}
          />
        ))}
        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="max-w-[80%] rounded-lg bg-muted p-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t bg-background/95 p-4 backdrop-blur-sm"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的需求..."
          rows={3}
          className="max-h-44 min-h-[88px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        {isLoading ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={handleStopGeneration}
            title="暂停生成"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
