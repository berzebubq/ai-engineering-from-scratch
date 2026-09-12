-- =============================================================================
--  AI Pet-SMM Analytics — схема базы данных
--  Спринт 1: Фундамент
--
--  Как применить:
--    Supabase Dashboard → SQL Editor → New query → вставить целиком → Run.
--    Скрипт идемпотентен: повторный запуск не ломает существующие данные.
-- =============================================================================

-- gen_random_uuid() живёт в pgcrypto. На Supabase расширение обычно уже есть,
-- но на чистом Postgres его нужно включить явно.
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
--  1. Перечисления (enum)
-- -----------------------------------------------------------------------------
-- create type не поддерживает IF NOT EXISTS, поэтому оборачиваем в do-блок.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'reel_type') then
    create type reel_type as enum ('my', 'competitor');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tag_category') then
    create type tag_category as enum ('character', 'vibe', 'structure', 'other');
  end if;
end
$$;

-- Откуда взялась связь "видео ↔ тег". Пока всё проставляется руками,
-- но в Спринте 2+ размечать будут Vision API и Whisper — колонка source
-- позволит отличить машинную разметку от вашей и отфильтровать её.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tag_source') then
    create type tag_source as enum ('manual', 'vision', 'whisper', 'llm');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
--  2. reels — видео (мои и конкурентов)
-- -----------------------------------------------------------------------------

create table if not exists public.reels (
  id            uuid primary key default gen_random_uuid(),

  url           text not null unique,
  thumbnail_url text,
  caption       text,

  -- Метрики. Заполняются руками в Спринте 1, парсером — позже.
  reach         integer not null default 0 check (reach    >= 0),
  plays         integer not null default 0 check (plays    >= 0),
  likes         integer not null default 0 check (likes    >= 0),
  saved         integer not null default 0 check (saved    >= 0),
  comments      integer not null default 0 check (comments >= 0),
  shares        integer not null default 0 check (shares   >= 0),

  type          reel_type not null default 'my',

  -- Engagement rate считается базой, а не приложением: одна формула,
  -- по ней можно сортировать и строить индексы.
  -- NULL, когда reach = 0 — это честнее, чем ноль (мы просто не знаем).
  engagement_rate numeric generated always as (
    case
      when reach > 0
      then round((likes + saved + comments + shares)::numeric / reach, 4)
    end
  ) stored,

  published_at  timestamptz,            -- когда опубликовано в Instagram
  created_at    timestamptz not null default now(),  -- когда добавлено к нам
  updated_at    timestamptz not null default now()
);

comment on table  public.reels is 'Видео: свои и конкурентов, с метриками из Instagram';
comment on column public.reels.engagement_rate is 'Вычисляется базой: (likes+saved+comments+shares)/reach. NULL при reach=0';

create index if not exists reels_type_idx         on public.reels (type);
create index if not exists reels_created_at_idx   on public.reels (created_at desc);
create index if not exists reels_published_at_idx on public.reels (published_at desc nulls last);

-- -----------------------------------------------------------------------------
--  3. tags — справочник атрибутов
-- -----------------------------------------------------------------------------

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   tag_category not null default 'other',
  created_at timestamptz not null default now(),

  -- "Кот" в category='character' и "кот" в category='vibe' — разные теги,
  -- а вот два "кота" в одной категории — дубль.
  constraint tags_category_name_key unique (category, name)
);

comment on table public.tags is 'Справочник атрибутов: персонаж, вайб, структура ролика';

create index if not exists tags_category_idx on public.tags (category);

-- -----------------------------------------------------------------------------
--  4. reel_tags — связь многие-ко-многим
-- -----------------------------------------------------------------------------

create table if not exists public.reel_tags (
  id         uuid primary key default gen_random_uuid(),
  reel_id    uuid not null references public.reels (id) on delete cascade,
  tag_id     uuid not null references public.tags  (id) on delete cascade,

  -- Заделы под авторазметку Спринта 2.
  source     tag_source not null default 'manual',
  confidence real check (confidence is null or (confidence >= 0 and confidence <= 1)),

  created_at timestamptz not null default now(),

  -- Один тег вешается на одно видео ровно один раз.
  constraint reel_tags_reel_id_tag_id_key unique (reel_id, tag_id)
);

comment on table  public.reel_tags is 'Связь видео ↔ тег (многие-ко-многим)';
comment on column public.reel_tags.source     is 'Кто проставил: человек, Vision API, Whisper или LLM';
comment on column public.reel_tags.confidence is 'Уверенность модели 0..1. NULL для ручной разметки';

-- on delete cascade использует эти индексы; Postgres не создаёт их сам.
create index if not exists reel_tags_reel_id_idx on public.reel_tags (reel_id);
create index if not exists reel_tags_tag_id_idx  on public.reel_tags (tag_id);

-- -----------------------------------------------------------------------------
--  5. updated_at — автообновление
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
-- Пустой search_path: функция не должна зависеть от того, кто её вызвал.
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reels_set_updated_at on public.reels;
create trigger reels_set_updated_at
  before update on public.reels
  for each row
  execute function public.set_updated_at();

-- =============================================================================
--  5b. Права на таблицы (GRANT)
--
--  RLS решает, какие СТРОКИ видит роль. GRANT решает, пустят ли её к таблице
--  вообще. Без гранта самая правильная RLS-политика даёт "permission denied
--  for table reels".
--
--  Supabase обычно выдаёт эти права сама через default privileges, так что
--  блок чаще всего избыточен. Пишем явно: повторный GRANT ничего не ломает,
--  а вот молчаливая зависимость от настроек проекта — ломает.
-- =============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on public.reels, public.tags, public.reel_tags
  to anon, authenticated;

-- =============================================================================
--  6. ROW LEVEL SECURITY
--
--  RLS включён на всех таблицах. Без единой политики это означает "запрещено
--  всё" — поэтому политики ниже обязательны, иначе приложение увидит пустую
--  базу и будет молча падать на вставках.
-- =============================================================================

alter table public.reels     enable row level security;
alter table public.tags      enable row level security;
alter table public.reel_tags enable row level security;

-- -----------------------------------------------------------------------------
--  6a. ПОЛИТИКИ ДЛЯ РАЗРАБОТКИ  —  ⚠️  DEV ONLY  ⚠️
--
--  Открывают чтение и запись анонимному ключу. Этого мы и хотим, пока
--  приложение крутится локально и авторизации ещё нет.
--
--  ВАЖНО: NEXT_PUBLIC_SUPABASE_ANON_KEY по определению попадает в браузерный
--  бандл и виден любому, кто откроет devtools. Пока действуют эти политики,
--  задеплоенное приложение = публичная база: кто угодно может читать, писать
--  и удалять ваши данные.
--
--  ПЕРЕД ПЕРВЫМ ДЕПЛОЕМ: удалить блок 6a, раскомментировать блок 6b.
-- -----------------------------------------------------------------------------

drop policy if exists "dev: full access to reels"     on public.reels;
drop policy if exists "dev: full access to tags"      on public.tags;
drop policy if exists "dev: full access to reel_tags" on public.reel_tags;

create policy "dev: full access to reels"
  on public.reels for all
  to anon, authenticated
  using (true) with check (true);

create policy "dev: full access to tags"
  on public.tags for all
  to anon, authenticated
  using (true) with check (true);

create policy "dev: full access to reel_tags"
  on public.reel_tags for all
  to anon, authenticated
  using (true) with check (true);

-- -----------------------------------------------------------------------------
--  6b. ПОЛИТИКИ ДЛЯ ПРОДАКШЕНА  —  включить, когда появится авторизация
--
--  Модель: читать может любой, писать — только залогиненный пользователь.
--  Если дашборд должен быть приватным целиком, уберите anon и из select.
-- -----------------------------------------------------------------------------

-- create policy "public read reels"
--   on public.reels for select
--   to anon, authenticated
--   using (true);
--
-- create policy "authenticated write reels"
--   on public.reels for all
--   to authenticated
--   using (true) with check (true);
--
-- create policy "public read tags"
--   on public.tags for select
--   to anon, authenticated
--   using (true);
--
-- create policy "authenticated write tags"
--   on public.tags for all
--   to authenticated
--   using (true) with check (true);
--
-- create policy "public read reel_tags"
--   on public.reel_tags for select
--   to anon, authenticated
--   using (true);
--
-- create policy "authenticated write reel_tags"
--   on public.reel_tags for all
--   to authenticated
--   using (true) with check (true);

-- =============================================================================
--  7. Стартовый набор тегов
--     on conflict do nothing — чтобы повторный прогон не падал.
-- =============================================================================

insert into public.tags (name, category) values
  ('Кот',              'character'),
  ('Собака',           'character'),
  ('Хозяин в кадре',   'character'),
  ('Несколько питомцев','character'),

  ('Милота',           'vibe'),
  ('Юмор',             'vibe'),
  ('Трогательное',     'vibe'),
  ('Экшн',             'vibe'),
  ('ASMR',             'vibe'),

  ('Хук в первые 3 сек','structure'),
  ('Закадровый голос',  'structure'),
  ('Текст на экране',   'structure'),
  ('Трендовый звук',    'structure'),
  ('Сюжет с развязкой', 'structure'),

  ('Рекламная интеграция', 'other')
on conflict (category, name) do nothing;
