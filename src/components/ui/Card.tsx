import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("card-glass rounded-2xl p-5 shadow-sm", className)} {...props} />;
}
