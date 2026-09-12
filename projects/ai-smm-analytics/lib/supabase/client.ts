"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Клиент Supabase для клиентских компонентов (браузер).
 *
 * Вызывайте внутри компонента — createBrowserClient сам кеширует синглтон,
 * поэтому лишних соединений не будет.
 *
 * В Спринте 1 почти все запросы идут через server actions и серверные
 * компоненты, так что этот клиент нужен редко: реалтайм-подписки, загрузка
 * файлов в Storage, optimistic UI.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
