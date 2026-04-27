"use client";

import { useTransition } from "react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
};

export function ConfirmServerActionForm({ action, confirmMessage, children, className }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      action={(formData) => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(() => {
          void action(formData);
        });
      }}
    >
      {pending ? <input type="hidden" name="_pending" value="1" readOnly /> : null}
      {children}
    </form>
  );
}
