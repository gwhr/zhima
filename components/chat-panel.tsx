"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { ChatMessage } from "@/components/chat-message";

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "抱歉，AI 响应出错了，请重试。" }
            : m
        )
      );
    }

    setIsLoading(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground mt-20 text-sm">
            开始和 AI 对话，描述你的需求
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

      <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的需求..."
          rows={2}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
