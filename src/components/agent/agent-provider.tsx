"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/trpc/react";

type PageContext = {
  page: string;
  applicationId?: string;
  documentType?: string;
  documentId?: string;
};

export type AgentModel = {
  id: string;
  label: string;
  provider: string;
};

export const AGENT_MODELS: AgentModel[] = [
  { id: "anthropic/claude-sonnet-4-20250514", label: "Sonnet 4", provider: "Anthropic" },
  { id: "anthropic/claude-opus-4-20250514", label: "Opus 4", provider: "Anthropic" },
  { id: "anthropic/claude-haiku-4-5-20251001", label: "Haiku 4.5", provider: "Anthropic" },
];

const DEFAULT_MODEL = AGENT_MODELS[0]!.id;
const MODEL_STORAGE_KEY = "agent-model";
const OPEN_CHATS_STORAGE_KEY = "agent-open-chats";
const ACTIVE_CHAT_STORAGE_KEY = "agent-active-chat";

type AgentContextValue = {
  isOpen: boolean;
  toggleAgent: () => void;
  openAgent: () => void;
  closeAgent: () => void;
  pageContext: PageContext;
  setPageContext: (ctx: PageContext) => void;
  modelId: string;
  setModelId: (id: string) => void;
  openChatIds: string[];
  activeChatId: string | null;
  openChat: (id: string) => void;
  closeChat: (id: string) => void;
  newChat: () => Promise<void>;
};

const AgentContext = createContext<AgentContextValue | null>(null);

const STORAGE_KEY = "agent-panel-open";

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext>({ page: "dashboard" });
  const [modelId, setModelIdState] = useState(DEFAULT_MODEL);
  const [openChatIds, setOpenChatIds] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const createChat = api.chat.create.useMutation();

  // Restore state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setIsOpen(true);

    const storedModel = localStorage.getItem(MODEL_STORAGE_KEY);
    if (storedModel && AGENT_MODELS.some((m) => m.id === storedModel)) {
      setModelIdState(storedModel);
    }

    const storedOpenChats = localStorage.getItem(OPEN_CHATS_STORAGE_KEY);
    if (storedOpenChats) {
      try {
        const ids = JSON.parse(storedOpenChats) as string[];
        if (Array.isArray(ids) && ids.length > 0) {
          setOpenChatIds(ids);
        }
      } catch {
        // ignore
      }
    }

    const storedActiveChat = localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
    if (storedActiveChat) {
      setActiveChatId(storedActiveChat);
    }
  }, []);

  const toggleAgent = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const openAgent = useCallback(() => {
    setIsOpen(true);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const closeAgent = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, "false");
  }, []);

  const setModelId = useCallback((id: string) => {
    setModelIdState(id);
    localStorage.setItem(MODEL_STORAGE_KEY, id);
  }, []);

  const openChat = useCallback((id: string) => {
    setOpenChatIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem(OPEN_CHATS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveChatId(id);
    localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, id);
  }, []);

  const closeChat = useCallback((id: string) => {
    setOpenChatIds((prev) => {
      const next = prev.filter((cid) => cid !== id);
      localStorage.setItem(OPEN_CHATS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveChatId((prev) => {
      if (prev !== id) return prev;
      // Activate the previous tab or null
      const remaining = openChatIds.filter((cid) => cid !== id);
      const next = remaining[remaining.length - 1] ?? null;
      localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, next ?? "");
      return next;
    });
  }, [openChatIds]);

  const newChat = useCallback(async () => {
    const chat = await createChat.mutateAsync({});
    openChat(chat.id);
  }, [createChat, openChat]);

  return (
    <AgentContext value={{
      isOpen,
      toggleAgent,
      openAgent,
      closeAgent,
      pageContext,
      setPageContext,
      modelId,
      setModelId,
      openChatIds,
      activeChatId,
      openChat,
      closeChat,
      newChat,
    }}>
      {children}
    </AgentContext>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent must be used within AgentProvider");
  return ctx;
}

/** Hook for pages to register their context on mount */
export function usePageContext(context: PageContext) {
  const { setPageContext } = useAgent();
  useEffect(() => {
    setPageContext(context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPageContext, context.page, context.applicationId, context.documentType, context.documentId]);
}
