"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function AnonymousPromptSubmit({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-3 w-full">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={300}
        rows={4}
        placeholder="כתבו כאן את התשובה שלכם..."
        className="w-full rounded-2xl card-glass px-4 py-3 text-lg resize-none focus:outline-none focus:border-brand-gold"
      />
      <Button
        size="lg"
        disabled={!text.trim()}
        onClick={() => {
          if (text.trim()) onSubmit(text.trim());
        }}
      >
        שליחת תשובה
      </Button>
      <p className="text-xs text-brand-muted text-center">התשובה תוצג באנונימיות למסך המרכזי</p>
    </div>
  );
}
