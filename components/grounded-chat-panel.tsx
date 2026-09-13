"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";

// Stable transport — created once at module level so useChat never sees a new object reference
const chatTransport = new DefaultChatTransport({
  api: "/api/chat",
});
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  MessageSquare,
  Play,
  Pause,
  Compass,
  Link as LinkIcon,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  isInternalMarkdownHref,
  parseInternalLinkSlug,
} from "@/lib/markdown-links";

interface GroundedChatPanelProps {
  reasoningContext?: string | null;
  replayPath: string[];
  replayStep: number;
  isReplaying: boolean;
  onStartReplay: (path: string[]) => void;
  onStopReplay: () => void;
  onStepReplay: (path: string[], stepIndex: number) => void;
  onInspectNode: (filename: string) => void;
  onRefreshGraphNeeded?: () => void;
}

export function GroundedChatPanelComponent({
  reasoningContext,
  replayPath,
  replayStep,
  isReplaying,
  onStartReplay,
  onStopReplay,
  onStepReplay,
  onInspectNode,
  onRefreshGraphNeeded,
}: GroundedChatPanelProps) {
  const [inputText, setInputText] = useState("");

  // Isolated AI chat state — streaming token updates stay strictly local to this component
  const { messages, sendMessage, status, stop } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: chatTransport,
  });

  const handlePromptSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (message.text.trim()) {
        sendMessage({ text: message.text });
        setInputText("");
      }
    },
    [sendMessage],
  );

  // Intercept markdown links in chat message responses to open the concept brief directly
  const responseComponents = useMemo(
    () => ({
      a: ({ href, children, ...props }: React.ComponentProps<"a">) => {
        const isInternal = isInternalMarkdownHref(href);
        const slug = parseInternalLinkSlug(href || "");

        if (isInternal && slug) {
          return (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                onInspectNode(slug);
              }}
              className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4 cursor-pointer hover:text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 text-xs"
              title={`Open ${slug} in concept brief viewer`}
              {...props}
            >
              <LinkIcon className="h-3 w-3 shrink-0" />
              <span>{children}</span>
            </a>
          );
        }

        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
            {...props}
          >
            {children}
          </a>
        );
      },
    }),
    [onInspectNode],
  );

  // Refresh graph data only when a mutating tool (save / delete / patch / merge / reconcile) was used
  const lastRefreshedAtRef = useRef(0);
  useEffect(() => {
    if (status !== "ready" || messages.length === 0 || !onRefreshGraphNeeded)
      return;
    if (messages.length === lastRefreshedAtRef.current) return;

    // Check the last assistant message for write-tool invocations
    const lastMsg = messages[messages.length - 1];
    const hasMutation = lastMsg?.parts?.some((p: any) => {
      const name =
        p.toolName ?? p.name ?? p.toolInvocation?.toolName ?? p.type ?? "";
      return (
        typeof name === "string" &&
        (name.includes("saveOKFAsset") ||
          name.includes("deleteOKFAsset") ||
          name.includes("patchOKFAsset") ||
          name.includes("mergeOKFAssets") ||
          name.includes("reconcileOKFBase"))
      );
    });

    if (hasMutation) {
      lastRefreshedAtRef.current = messages.length;
      onRefreshGraphNeeded();
    } else {
      // Still mark as seen so we don't re-check on next render
      lastRefreshedAtRef.current = messages.length;
    }
  }, [status, messages.length, onRefreshGraphNeeded]);

  return (
    <div className="flex flex-col flex-1 min-h-0 px-2.5 pb-2 gap-1">
      {reasoningContext ? (
        <p
          className="text-[10px] text-muted-foreground truncate shrink-0 pt-1"
          title={reasoningContext}
        >
          Context:{" "}
          <span className="text-foreground/80">{reasoningContext}</span>
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground truncate shrink-0 pt-1">
          All organizational concepts
        </p>
      )}
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="size-10 text-muted-foreground" />}
              title="Consult Organizational Memory"
              description="Ask questions, trace operational decisions, explore concept relationships, or discover institutional context."
            />
          ) : (
            messages.map((message) => {
              const readToolCalls: string[] = [];
              message.parts?.forEach((p: any) => {
                const isReadOKF =
                  p.type === "tool-readOKFAsset" ||
                  p.toolName === "readOKFAsset" ||
                  p.name === "readOKFAsset" ||
                  p.toolInvocation?.toolName === "readOKFAsset" ||
                  (typeof p.type === "string" &&
                    p.type.includes("readOKFAsset"));
                if (isReadOKF) {
                  const fn =
                    p.input?.filename ||
                    p.args?.filename ||
                    p.toolInvocation?.args?.filename ||
                    p.input?.path ||
                    p.args?.path;
                  if (
                    fn &&
                    typeof fn === "string" &&
                    !readToolCalls.includes(fn)
                  ) {
                    readToolCalls.push(fn);
                  }
                }
              });

              const isCurrentReplayPath =
                replayPath.length > 0 &&
                readToolCalls.length > 0 &&
                replayPath.join() === readToolCalls.join();

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "step-start":
                          return i > 0 ? (
                            <div
                              key={i}
                              className="text-muted-foreground opacity-40"
                            >
                              <hr className="my-2 border-border" />
                            </div>
                          ) : null;
                        case "text":
                          return (
                            <MessageResponse
                              key={`${message.id}-${i}`}
                              components={responseComponents}
                            >
                              {part.text}
                            </MessageResponse>
                          );
                        default:
                          return null;
                      }
                    })}

                    {readToolCalls.length > 0 && (
                      <div className="mt-3 p-2.5 bg-muted/40 border rounded-lg flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <Compass className="h-3.5 w-3.5" />
                            <span>
                              Reasoning Trail ({readToolCalls.length} steps)
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isReplaying && isCurrentReplayPath ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={onStopReplay}
                                className="h-6 text-[11px] gap-1 px-2"
                              >
                                <Pause className="h-3 w-3" /> Pause
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => onStartReplay(readToolCalls)}
                                className="h-6 text-[11px] gap-1 px-2 font-semibold"
                              >
                                <Play className="h-3 w-3" /> Trace Trail
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap text-xs">
                          {readToolCalls.map((fn, idx) => {
                            const isCurrentStep =
                              isCurrentReplayPath && replayStep === idx;
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-1"
                              >
                                {idx > 0 && (
                                  <span className="text-muted-foreground text-[10px]">
                                    ➔
                                  </span>
                                )}
                                <Badge
                                  variant={
                                    isCurrentStep ? "default" : "outline"
                                  }
                                  onClick={() => {
                                    onStepReplay(readToolCalls, idx);
                                    onInspectNode(fn);
                                  }}
                                  className={`cursor-pointer font-mono text-[10px] px-1.5 py-0 transition-all ${
                                    isCurrentStep
                                      ? "ring-2 ring-primary scale-105"
                                      : "hover:bg-muted"
                                  }`}
                                >
                                  {idx + 1}: {fn}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </MessageContent>
                </Message>
              );
            })
          )}
          {(status === "submitted" || status === "streaming") && (
            <Shimmer duration={4}>
              Tracing concept graph &amp; synthesizing response…
            </Shimmer>
          )}
        </ConversationContent>
        <ConversationDownload messages={messages} />
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        onSubmit={handlePromptSubmit}
        className="w-full relative shrink-0"
      >
        <PromptInputBody>
          <PromptInputTextarea
            value={inputText}
            placeholder="Ask a question or trace a decision path…"
            onChange={(e) => setInputText(e.currentTarget.value)}
            className="pr-12 min-h-11"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit
            status={status}
            disabled={
              !inputText.trim() &&
              !(status === "submitted" || status === "streaming")
            }
            className="absolute bottom-1 right-1"
            onClick={() => stop()}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export const GroundedChatPanel = memo(GroundedChatPanelComponent);
