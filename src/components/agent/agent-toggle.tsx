"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAgent } from "@/components/agent/agent-provider";

export function AgentToggle() {
  const { toggleAgent, isOpen } = useAgent();

  return (
    <Button
      variant={isOpen ? "secondary" : "ghost"}
      size="icon"
      onClick={toggleAgent}
      className="h-8 w-8"
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  );
}
