import { Suspense } from "react";
import { JoinForm } from "./JoinForm";
import Loading from "../loading";

export default function JoinPage() {
  return (
    <Suspense fallback={<Loading />}>
      <JoinForm />
    </Suspense>
  );
}
