"use client";

import { useActionState, useState } from "react";

import { initialActionState, type ActionState } from "@/app/actions/types";

type ServerAction = (
  prevState: ActionState,
  formData: FormData,
) => Promise<ActionState>;

/**
 * Диалог с формой на server action, который закрывается сам после успеха.
 *
 * Закрытие происходит внутри самого экшена, а не в useEffect по статусу:
 * setState из эффекта запускает лишний каскад рендеров (и справедливо ругается
 * react-hooks/set-state-in-effect). Здесь же это прямое следствие события —
 * «экшен вернул success, значит закрываем».
 *
 * @example
 * const { open, setOpen, state, formAction, isPending } =
 *   useActionDialog(createReel);
 */
export function useActionDialog(action: ServerAction) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const result = await action(prevState, formData);
      if (result.status === "success") {
        setOpen(false);
      }
      return result;
    },
    initialActionState,
  );

  return { open, setOpen, state, formAction, isPending };
}
