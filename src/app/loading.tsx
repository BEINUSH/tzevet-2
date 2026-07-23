import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Loading() {
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingSpinner className="size-8 text-brand-gold" />
      <div>
        <p className="font-bold">טוענים את הערב...</p>
        <p className="mt-1 text-sm text-brand-muted">
          אם השרת היה במנוחה, הטעינה עשויה להימשך עד כדקה.
        </p>
      </div>
    </main>
  );
}
