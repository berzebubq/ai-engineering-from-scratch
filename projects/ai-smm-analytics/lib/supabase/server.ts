import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Клиент Supabase для серверных компонентов, server actions и route handlers.
 *
 * Новый клиент на каждый запрос — переиспользовать нельзя: в куках лежит
 * сессия конкретного пользователя, и общий клиент раздал бы её всем подряд.
 *
 * Импорт "server-only" превращает случайный импорт из клиентского компонента
 * в ошибку сборки, а не в утечку в браузерный бандл.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Серверные компоненты не могут писать куки — здесь это нормально.
          // Обновление сессии возьмёт на себя middleware, когда появится
          // авторизация. Без try/catch рендер падал бы на каждом refresh токена.
        }
      },
    },
  });
}
