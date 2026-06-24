create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tomou_medicamentos boolean,
  bebeu_agua boolean,
  movimentou boolean,
  humor text check (humor in ('feliz', 'neutro', 'triste')),
  feedback text,
  created_at timestamptz not null default now()
);

alter table public.daily_checkins enable row level security;

drop policy if exists "Users manage own daily checkins" on public.daily_checkins;
create policy "Users manage own daily checkins"
on public.daily_checkins
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.daily_checkins to authenticated;

create index if not exists daily_checkins_user_created_idx
on public.daily_checkins (user_id, created_at desc);

create table if not exists public.action_recommendations (
  id uuid primary key default gen_random_uuid(),
  fator_risco text not null,
  contexto text not null,
  dia_semana int not null check (dia_semana between 0 and 6),
  mensagem text not null,
  created_at timestamptz not null default now()
);

alter table public.action_recommendations enable row level security;

drop policy if exists "Authenticated users can read action recommendations" on public.action_recommendations;
create policy "Authenticated users can read action recommendations"
on public.action_recommendations
for select
to authenticated
using (true);

grant select on public.action_recommendations to authenticated;

insert into public.action_recommendations (fator_risco, contexto, dia_semana, mensagem)
values
  ('pressao', 'sem_registro_2_dias', 1, 'Comece a semana medindo sua pressão em repouso. Leva 2 minutos e deixa seu relatório mais preciso.'),
  ('pressao', 'registro_elevado', 2, 'Sua última pressão ficou acima do ideal. Meça novamente hoje para comparar.'),
  ('pressao', 'registro_elevado', 3, 'Hoje vale reduzir sal nas refeições e registrar a pressão no fim do dia.'),
  ('pressao', 'fim_de_semana', 5, 'Final de semana chegando: reduza o sal e registre sua pressão antes de sair da rotina.'),
  ('pressao', 'normal', 4, 'Sua pressão está em acompanhamento. Registre mais uma medida hoje para confirmar estabilidade.'),
  ('sedentarismo', 'inicio_semana', 1, 'Comece pequeno: 10 minutos de caminhada hoje já contam para seu coração.'),
  ('sedentarismo', 'meio_semana', 3, 'Você não se moveu muito esta semana. Uma volta no quarteirão hoje já ajuda.'),
  ('sedentarismo', 'fim_de_semana', 6, 'Escolha uma caminhada leve hoje. Sem meta grande, só consistência.'),
  ('alimentacao', 'inicio_semana', 1, 'Troque o refrigerante por água no almoço hoje. Só isso já é uma vitória.'),
  ('alimentacao', 'meio_semana', 3, 'Inclua uma salada ou fruta em uma refeição hoje. Pequena troca, efeito real.'),
  ('alimentacao', 'fim_de_semana', 5, 'Final de semana chegando: reduza sal e ultraprocessados hoje para proteger sua pressão.'),
  ('diabetes', 'sem_glicemia', 2, 'Se você mede glicemia, registre um valor hoje. Isso ajuda a enxergar tendência, não só um número.'),
  ('diabetes', 'glicemia_alta', 3, 'Sua glicemia recente pede atenção. Priorize uma refeição mais simples e registre novamente depois.'),
  ('peso', 'sem_registro', 4, 'Registre seu peso hoje para acompanhar evolução sem depender de memória.'),
  ('peso', 'subiu', 2, 'Seu peso subiu no último registro. Uma troca pequena na alimentação hoje já faz diferença.'),
  ('sono', 'sono_ruim', 4, 'Hoje tente desligar telas 30 minutos antes de dormir. Seu coração também sente o descanso.'),
  ('sono', 'normal', 0, 'Mantenha seu horário de sono hoje. Rotina estável ajuda pressão e energia.'),
  ('score', 'piorou', 2, 'Seu score caiu desde a última avaliação. Veja o que mudou e faça um check-in agora.'),
  ('score', 'melhorou', 4, 'Seu score melhorou. Registre um indicador hoje para confirmar a tendência.'),
  ('geral', 'sem_app_3_dias', 0, 'Seu coração está esperando por você. 30 segundos para ver como está.')
on conflict do nothing;
