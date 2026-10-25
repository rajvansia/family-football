create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 60),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  commissioner_user_id uuid not null references public.profiles(id),
  season integer not null,
  timezone text not null default 'America/New_York',
  scoring_rules jsonb not null default '{"correct":1,"incorrect":0,"missing":0,"tie":"incorrect"}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('commissioner', 'member')),
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  provider_game_id text not null unique,
  season integer not null,
  week integer not null check (week between 1 and 22),
  season_type text not null default 'regular' check (season_type in ('preseason', 'regular', 'postseason')),
  home_team_id text not null,
  away_team_id text not null,
  scheduled_kickoff_utc timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'final', 'postponed', 'canceled')),
  home_score integer,
  away_score integer,
  winner_team_id text,
  last_synced_at timestamptz,
  check (home_team_id <> away_team_id),
  check (winner_team_id is null or winner_team_id in (home_team_id, away_team_id))
);

create index games_season_week_idx on public.games (season, week, season_type);
create index games_kickoff_idx on public.games (scheduled_kickoff_utc);

create table public.picks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selected_team_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locked_at timestamptz,
  unique (league_id, game_id, user_id)
);

create index picks_league_game_idx on public.picks (league_id, game_id);
create index picks_user_league_idx on public.picks (user_id, league_id);

create table public.scoring_results (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  correctness boolean not null,
  finalized_at timestamptz not null default now(),
  scoring_version integer not null default 1,
  unique (league_id, game_id, user_id, scoring_version)
);

create table public.league_invitations (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_league_member(target_league uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.league_members lm
    where lm.league_id = target_league and lm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_league_commissioner(target_league uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.league_members lm
    where lm.league_id = target_league
      and lm.user_id = (select auth.uid())
      and lm.role = 'commissioner'
  );
$$;

create or replace function public.create_family_league(league_name text, league_season integer, league_timezone text default 'America/New_York')
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  new_league_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles p where p.id = current_user_id) then
    insert into public.profiles (id, display_name)
    values (current_user_id, coalesce(nullif(trim((auth.jwt() -> 'user_metadata' ->> 'display_name')), ''), 'Family member'));
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = league_timezone) then
    raise exception 'Invalid timezone';
  end if;
  insert into public.leagues (name, commissioner_user_id, season, timezone)
  values (trim(league_name), current_user_id, league_season, league_timezone)
  returning id into new_league_id;
  insert into public.league_members (league_id, user_id, role)
  values (new_league_id, current_user_id, 'commissioner');
  return new_league_id;
end;
$$;

create or replace function public.submit_pick(target_league uuid, target_game uuid, target_team text)
returns public.picks
language plpgsql security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_game public.games%rowtype;
  league_timezone text;
  saved_pick public.picks%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not public.is_league_member(target_league) then raise exception 'League membership required'; end if;

  select * into selected_game from public.games g where g.id = target_game for share;
  if not found or selected_game.season_type <> 'regular' then raise exception 'Game is not eligible'; end if;
  select l.timezone into league_timezone from public.leagues l where l.id = target_league;
  if extract(dow from selected_game.scheduled_kickoff_utc at time zone league_timezone) <> 0 then
    raise exception 'Game is not on Sunday in the league timezone';
  end if;
  if target_team not in (selected_game.home_team_id, selected_game.away_team_id) then
    raise exception 'Selected team is not playing in this game';
  end if;
  if selected_game.status <> 'scheduled' or clock_timestamp() >= selected_game.scheduled_kickoff_utc then
    raise exception 'Picks are locked for this game';
  end if;

  insert into public.picks (league_id, game_id, user_id, selected_team_id, locked_at)
  values (target_league, target_game, current_user_id, target_team, null)
  on conflict (league_id, game_id, user_id) do update
    set selected_team_id = excluded.selected_team_id, updated_at = now()
  returning * into saved_pick;
  return saved_pick;
end;
$$;

create or replace function public.create_league_invitation(target_league uuid, valid_for interval default interval '7 days')
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not public.is_league_commissioner(target_league) then raise exception 'Commissioner access required'; end if;
  if valid_for <= interval '0' or valid_for > interval '30 days' then raise exception 'Invalid expiry'; end if;
  insert into public.league_invitations (league_id, token_hash, expires_at, created_by)
  values (target_league, extensions.digest(raw_token, 'sha256'), now() + valid_for, auth.uid());
  return raw_token;
end;
$$;

create or replace function public.redeem_league_invitation(invitation_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invitation public.league_invitations%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if length(invitation_token) <> 64 then raise exception 'Invalid invitation'; end if;
  select * into invitation from public.league_invitations i
    where i.token_hash = extensions.digest(invitation_token, 'sha256')
      and i.redeemed_at is null and i.expires_at > now()
    for update;
  if not found then raise exception 'Invitation is invalid or expired'; end if;
  insert into public.profiles (id, display_name)
  values (current_user_id, coalesce(nullif(trim((auth.jwt() -> 'user_metadata' ->> 'display_name')), ''), 'Family member'))
  on conflict (id) do nothing;
  insert into public.league_members (league_id, user_id, role)
  values (invitation.league_id, current_user_id, 'member')
  on conflict (league_id, user_id) do nothing;
  update public.league_invitations set redeemed_at = now() where id = invitation.id;
  return invitation.league_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.games enable row level security;
alter table public.picks enable row level security;
alter table public.scoring_results enable row level security;
alter table public.league_invitations enable row level security;
alter table public.audit_log enable row level security;

create policy "Profiles visible to league members" on public.profiles for select to authenticated
using (id = (select auth.uid()) or exists (
  select 1 from public.league_members mine
  join public.league_members theirs on theirs.league_id = mine.league_id
  where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
));
create policy "Users update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "League members read league" on public.leagues for select to authenticated
using (public.is_league_member(id));
create policy "Commissioners update league" on public.leagues for update to authenticated
using (public.is_league_commissioner(id)) with check (commissioner_user_id = (select auth.uid()) or public.is_league_commissioner(id));
create policy "Members read roster" on public.league_members for select to authenticated
using (public.is_league_member(league_id));
create policy "League members read games" on public.games for select to authenticated
using (exists (select 1 from public.leagues l where l.season = games.season and public.is_league_member(l.id)));
create policy "Members read league picks" on public.picks for select to authenticated
using (public.is_league_member(league_id));
create policy "Members read scoring" on public.scoring_results for select to authenticated
using (public.is_league_member(league_id));
create policy "Commissioners manage invitations" on public.league_invitations for select to authenticated
using (public.is_league_commissioner(league_id));
create policy "Commissioners read audit" on public.audit_log for select to authenticated
using (public.is_league_commissioner(league_id));

revoke all on public.picks from anon, authenticated;
grant select on public.picks to authenticated;
revoke all on function public.submit_pick(uuid, uuid, text) from public, anon;
revoke all on function public.create_family_league(text, integer, text) from public, anon;
revoke all on function public.create_league_invitation(uuid, interval) from public, anon;
revoke all on function public.redeem_league_invitation(text) from public, anon;
revoke all on function public.is_league_member(uuid) from public, anon;
revoke all on function public.is_league_commissioner(uuid) from public, anon;
grant execute on function public.submit_pick(uuid, uuid, text) to authenticated;
grant execute on function public.create_family_league(text, integer, text) to authenticated;
grant execute on function public.create_league_invitation(uuid, interval) to authenticated;
grant execute on function public.redeem_league_invitation(text) to authenticated;
grant execute on function public.is_league_member(uuid) to authenticated;
grant execute on function public.is_league_commissioner(uuid) to authenticated;
