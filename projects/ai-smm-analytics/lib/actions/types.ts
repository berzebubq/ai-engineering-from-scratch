/**
 * Общий тип результата server actions.
 *
 * Лежит отдельным файлом, потому что модуль с директивой 'use server' может
 * экспортировать только async-функции — тип или константа рядом с экшеном
 * ломают сборку.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  /** Общая ошибка: сеть, RLS, нарушение ограничения БД. */
  message?: string;
  /** Ошибки по конкретным полям формы. */
  fieldErrors?: Record<string, string>;
};

export const initialActionState: ActionState = { status: "idle" };
