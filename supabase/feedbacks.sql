-- ============================================================
-- Feedbacks do portfólio — tabela, segurança (RLS) e realtime
-- Rode este script no Supabase: painel do projeto → SQL Editor
-- → New query → cole tudo → Run.
-- ============================================================

-- Tabela
create table public.feedbacks (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 40),
  message text not null check (char_length(trim(message)) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Realtime: transmite INSERTs para os navegadores conectados
alter publication supabase_realtime add table public.feedbacks;

-- ============================================================
-- Row Level Security
-- Qualquer visitante pode LER e ENVIAR. Ninguém (via anon key)
-- pode EDITAR ou APAGAR: sem policy de UPDATE/DELETE, o Postgres
-- nega por padrão.
-- ============================================================
alter table public.feedbacks enable row level security;

create policy "leitura publica"
  on public.feedbacks for select
  using (true);

create policy "envio publico"
  on public.feedbacks for insert
  with check (
    char_length(trim(name)) between 1 and 40
    and char_length(trim(message)) between 1 and 500
  );

-- ============================================================
-- Rate limit básico (anti-spam), no servidor:
-- no máximo 10 mensagens por minuto no total.
-- (O site ainda aplica um cooldown de 30s por visitante.)
-- ============================================================
create or replace function public.feedbacks_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recentes int;
begin
  select count(*) into recentes
  from public.feedbacks
  where created_at > now() - interval '1 minute';

  if recentes >= 10 then
    raise exception 'Muitas mensagens agora — tente de novo em instantes.';
  end if;

  return new;
end;
$$;

create trigger feedbacks_rate_limit
  before insert on public.feedbacks
  for each row execute function public.feedbacks_rate_limit();
