"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/app/actions/types";
import { createClient } from "@/lib/supabase/server";
import { createReelSchema } from "@/lib/validations/reel";

/**
 * Мутации над видео.
 *
 * Каждый экспорт отсюда — публичный HTTP-эндпоинт: 'use server' превращает
 * функцию в POST-обработчик, до которого можно достучаться в обход формы.
 * Поэтому вход валидируется здесь, а не (только) в UI.
 */

/**
 * Добавляет видео. Сигнатура под useActionState: (prevState, formData).
 */
export async function createReel(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createReelSchema.safeParse({
    url: formData.get("url"),
    reach: formData.get("reach"),
    plays: formData.get("plays"),
    likes: formData.get("likes"),
    saved: formData.get("saved"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      // Первая ошибка по полю — самая конкретная, остальные обычно шум.
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Проверьте заполнение формы",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reels").insert(parsed.data);

  if (error) {
    // 23505 — нарушение unique. Единственный случай, который пользователь
    // может исправить сам, поэтому объясняем его словами.
    if (error.code === "23505") {
      return {
        status: "error",
        message: "Такое видео уже есть в базе",
        fieldErrors: { url: "Эта ссылка уже добавлена" },
      };
    }

    return {
      status: "error",
      message: `Не удалось сохранить видео: ${error.message}`,
    };
  }

  // Дашборд — серверный компонент, сам он о новой строке не узнает.
  revalidatePath("/");

  return { status: "success" };
}
