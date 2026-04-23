"use client";

import {
  X,
  Plus,
  MessageSquare,
  History,
  ArrowLeft,
  Trash2,
} from "lucide-react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/components/agent/agent-provider";
import { ChatInstance } from "@/components/agent/chat-instance";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function ChatTab({
  chatId,
  isActive,
  onActivate,
  onClose,
}: {
  chatId: string;
  isActive: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const { data } = api.chat.get.useQuery({ id: chatId });
  const title = data?.title ?? "New chat";

  return (
    <div
      className={`group relative flex h-7 max-w-[140px] shrink-0 cursor-pointer items-center overflow-hidden rounded-md px-2 text-xs transition-colors ${
        isActive
          ? "bg-muted font-medium"
          : "text-muted-foreground hover:bg-muted/60"
      }`}
      onClick={() => onActivate(chatId)}
    >
      <span className="truncate">{title}</span>
      {/* Fade mask + close button — absolute overlay, only visible on hover */}
      <span className="to-muted pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end rounded-r-md bg-gradient-to-r from-transparent opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <button
          className="bg-muted/60 text-muted-foreground hover:text-foreground mr-1 flex h-5 w-5 items-center justify-center rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onClose(chatId);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

type ChatMessage = {
  role: string;
  parts?: { type: string; text?: string }[];
  content?: string | { type: string; text?: string }[];
};

function lastMessageSnippet(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  // Walk backwards to find the last assistant or user message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as ChatMessage;
    const raw = msg?.parts ?? msg?.content;
    let text = "";
    if (typeof raw === "string") {
      text = raw;
    } else if (Array.isArray(raw)) {
      text = raw
        .filter((p) => p.type === "text")
        .map((p) => p.text ?? "")
        .join(" ");
    }
    text = text.trim();
    if (text) return text;
  }
  return null;
}

function ChatHistoryPanel({ onClose }: { onClose: () => void }) {
  const { openChat, closeChat, openChatIds } = useAgent();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: chats = [] } = api.chat.list.useQuery();
  const deleteChat = api.chat.delete.useMutation({
    onSuccess: async () => {
      await utils.chat.list.invalidate();
      if (deletingId) {
        if (openChatIds.includes(deletingId)) {
          closeChat(deletingId);
        }
        setDeletingId(null);
      }
    },
  });

  const chatToDelete = deletingId
    ? chats.find((c) => c.id === deletingId)
    : null;

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-medium">Recent chats</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="text-muted-foreground px-4 py-8 text-center text-xs">
              No chats yet
            </div>
          ) : (
            <ul className="divide-y">
              {chats.map((chat) => {
                const snippet = lastMessageSnippet(chat.messages);
                return (
                  <li
                    key={chat.id}
                    className="hover:bg-muted/40 flex items-center gap-2 px-3 py-2.5"
                  >
                    <button
                      className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                      onClick={() => {
                        openChat(chat.id);
                        onClose();
                      }}
                    >
                      <span className="truncate text-sm">
                        {chat.title ?? "New chat"}
                      </span>
                      {snippet && (
                        <span className="text-muted-foreground truncate text-xs">
                          {snippet}
                        </span>
                      )}
                    </button>
                    <button
                      className="text-muted-foreground/50 hover:text-destructive shrink-0 rounded p-0.5"
                      onClick={() => setDeletingId(chat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={!!deletingId}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            &ldquo;{chatToDelete?.title ?? "New chat"}&rdquo; will be
            permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingId) {
                  deleteChat.mutate({ id: deletingId });
                }
              }}
              disabled={deleteChat.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AgentPanel() {
  const {
    isOpen,
    closeAgent,
    openChatIds,
    activeChatId,
    openChat,
    closeChat,
    newChat,
  } = useAgent();

  const [showHistory, setShowHistory] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="bg-background flex h-full w-full shrink-0 flex-col border-l lg:w-[400px] xl:w-[440px]">
      {/* Combined header: tabs + actions */}
      <div className="flex shrink-0 items-center border-b px-2 py-1.5">
        {/* Scrollable tab strip */}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {openChatIds.map((id) => (
            <ChatTab
              key={id}
              chatId={id}
              isActive={id === activeChatId}
              onActivate={(chatId) => {
                setShowHistory(false);
                openChat(chatId);
              }}
              onClose={closeChat}
            />
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => {
              setShowHistory(false);
              void newChat();
            }}
            title="New chat"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Right-side controls — never shrink */}
        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Recent chats"
            onClick={() => setShowHistory((v) => !v)}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={closeAgent}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {showHistory ? (
        <ChatHistoryPanel onClose={() => setShowHistory(false)} />
      ) : openChatIds.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No chats yet</p>
            <p className="text-muted-foreground text-xs">
              Start a new chat to get going.
            </p>
          </div>
          <Button size="sm" onClick={() => void newChat()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New chat
          </Button>
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          {openChatIds.map((id) => (
            <ChatInstance key={id} chatId={id} isActive={id === activeChatId} />
          ))}
        </div>
      )}
    </div>
  );
}
