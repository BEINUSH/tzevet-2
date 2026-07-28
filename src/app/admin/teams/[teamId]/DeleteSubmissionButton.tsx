"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSubmission } from "../actions";

export function DeleteSubmissionButton({ submissionId }: { submissionId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      className="text-brand-danger text-sm underline shrink-0"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteSubmission(submissionId);
          router.refresh();
        })
      }
    >
      מחיקה
    </button>
  );
}
