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

/** Результат синхронизации с Instagram. */
export type SyncState = {
  status: "idle" | "success" | "partial" | "error";
  message?: string;
  /** Сколько видео добавлено и сколько обновлено. */
  created?: number;
  updated?: number;
  /**
   * Видео, по которым не удалось получить метрики. Синхронизация при этом не
   * прерывается: лучше обновить девять из десяти, чем ни одного.
   */
  failed?: Array<{ url: string; reason: string }>;
  finishedAt?: string;
};

export const initialSyncState: SyncState = { status: "idle" };
