# HTCare - Organizacao atual do codigo

Atualizado em 2026-06-26.

Este documento organiza o que ja existe no codigo da HTCare na mesma estrutura de produto que estamos usando para decidir os proximos passos: Conta e Perfil, Exames, Admin, IA Carelito e Produto.

## 1. Conta e Perfil

### Ja existe

- Autenticacao por Supabase em `/auth`.
- Cadastro/login com fluxo para onboarding.
- Perfil principal em `/perfil`.
- Telas internas reais em `/perfil/$section` para:
  - Conta
  - Planos
  - Informacoes pessoais
  - Dados de saude
  - Historico medico
  - Medicamentos
  - Exames e resultados
  - Metas de saude
  - Configuracoes
  - Notificacoes
  - Privacidade e seguranca
  - Idioma
  - Aparencia
  - Central de ajuda
- Edicao de dados pessoais, dados de saude e historico medico.
- Recalculo de score quando dados de saude/historico medico mudam.
- Medicamentos com adicionar/remover.
- Preferencias de notificacao em `notification_preferences`.
- Upload de foto de perfil para Supabase Storage no bucket `avatars`.
- Avatar exibido no painel e no perfil via `profiles.avatar_url`.

### Parcial

- Exclusao de conta aparece no fluxo de configuracoes, mas ainda deve ser validada em producao com as permissoes corretas do Supabase.
- Alteracao de senha usa recuperacao por email; nao ha tela propria completa de troca de senha dentro do app.
- Algumas telas antigas separadas ainda existem, como `/medicamentos` e `/exames`, alem das secoes novas dentro de `/perfil/$section`.

### Falta / proximo

- Revisar navegacao para reduzir duplicidade entre telas antigas e novas secoes do perfil.
- Criar uma politica final de conta: trocar senha, excluir conta, exportar dados e privacidade.
- Validar os buckets do Supabase em producao: `avatars`, `exams`, `resultados_exames`, `requisicoes`.

### Arquivos principais

- `src/routes/auth.tsx`
- `src/routes/perfil.tsx`
- `src/routes/perfil.$section.tsx`
- `src/routes/medicamentos.tsx`
- `src/integrations/supabase/types.ts`

## 2. Exames

### Ja existe

- Fluxo de solicitacao de exame dentro de `/meu-risco`.
- Tabela esperada: `exam_requests`.
- Solicita cidade, telefone e plano de saude.
- Painel medico em `/medico` para revisar solicitacoes.
- Rota antiga `/admin/medico` redireciona para `/medico`.
- Medico pode autorizar, recusar/pedir informacoes e gerar requisicao.
- Upload de exames/documentos em `/exames`.
- Upload de resultado do exame vinculado a uma solicitacao.
- Tela de resultado interpretado em `/exame-resultado/$id`.
- Modo demo em `/exame-resultado/demo`.
- Tabela esperada: `exam_results`.
- Interpretacao estruturada de biomarcadores:
  - ApoB
  - LDL
  - HDL
  - Triglicerideos
  - HbA1c
  - Glicemia de jejum
  - Insulina de jejum / HOMA-IR
  - PCR-us
- Recalculo de score com biomarcadores reais via regra deterministica.
- Protocolo de 90 dias em `/protocolo-90-dias/$id`.

### Parcial

- O upload de PDF/imagem existe, mas a leitura automatica ainda nao existe.
- A interpretacao da tela de resultado depende de valores estruturados salvos em `exam_results`.
- O PDF do relatorio ainda e mais proximo de impressao/relatorio visual do que um gerador robusto de PDF server-side.
- O fluxo de laboratorio parceiro ainda e semi-manual.

### Falta / proximo

- Criar pipeline de leitura de exame por IA/OCR:
  - upload do arquivo
  - extracao dos valores
  - revisao/confirmacao pelo usuario ou admin
  - salvar em `exam_results`
  - abrir automaticamente a tela interpretada
- Criar fila de exames pendentes para admin/medico revisar.
- Transformar o relatorio em PDF profissional gerado de forma confiavel.
- Conectar laboratorio parceiro real quando existir agenda/API.

### Arquivos principais

- `src/routes/meu-risco.tsx`
- `src/routes/exames.tsx`
- `src/routes/exame-resultado.$id.tsx`
- `src/routes/medico.tsx`
- `src/routes/admin.medico.tsx`
- `src/routes/protocolo-90-dias.$id.tsx`
- `src/lib/exam-interpretation.ts`
- `docs/exam-request-flow.md`

## 3. Admin

### Ja existe

- Painel oculto em `/htcare-admin`.
- Protecao por login Supabase.
- Validacao de admin via emails permitidos e service role.
- Variavel recomendada: `HTCARE_ADMIN_EMAILS`.
- Fallback atual inclui os emails principais do Felipe.
- Overview com usuarios, perfis, assessments, check-ins e solicitacoes de exame.
- Painel medico separado em `/medico`.

### Parcial

- `/htcare-admin` e mais observacional: ele mostra dados, mas ainda nao e um painel operacional completo.
- `/medico` opera solicitacoes de exame, mas e focado no medico parceiro, nao no administrador geral.
- Permissoes ainda dependem muito de env/configuracao e RLS correta no Supabase.

### Falta / proximo

- Adicionar fila de exames enviados aguardando leitura.
- Adicionar filtros, busca e status por usuario.
- Criar acoes de admin:
  - ver perfil completo
  - ver onboarding respondido
  - ver exames/resultados
  - marcar contato feito
  - registrar observacao interna
- Criar uma tabela de roles/admins se quiser sair do modelo por email em env.

### Arquivos principais

- `src/routes/htcare-admin.tsx`
- `src/lib/api/admin.functions.ts`
- `src/routes/medico.tsx`

## 4. IA Carelito

### Ja existe

- Chat flutuante do Carelito no app.
- Server function `askCarelito`.
- Uso de Anthropic quando `ANTHROPIC_API_KEY` esta configurada.
- Fallback deterministico quando nao ha chave de IA.
- Prompt com limites de seguranca medica:
  - nao diagnosticar
  - nao prescrever
  - orientar consulta medica em risco/sintomas
- Mascote Carelito como componente visual.
- Documento de identidade do Carelito.
- Interpretacao deterministica de exames em linguagem simples.

### Parcial

- O Carelito conversa, mas ainda nao le diretamente PDF/foto de exame.
- A interpretacao de exame nao e gerada por IA livre; ela usa regras estruturadas em `exam-interpretation`.
- O Carelito ainda nao tem memoria longa sofisticada alem do contexto enviado pela tela.

### Falta / proximo

- Implementar leitor de exame com IA:
  - aceitar foto/PDF
  - extrair biomarcadores
  - mostrar valores encontrados para confirmacao
  - salvar em `exam_results`
  - gerar explicacao final
- Criar contexto mais rico para o chat:
  - score atual
  - fatores de risco
  - ultimos registros
  - exames recentes
  - medicamentos
- Criar logs/limites de uso para custo e seguranca.

### Arquivos principais

- `src/components/CarelitoChat.tsx`
- `src/components/HeartMascot.tsx`
- `src/lib/api/carelito.functions.ts`
- `src/lib/exam-interpretation.ts`
- `docs/carelito.md`
- `public/brand/carelito-main.png`
- `public/brand/carelito-reference.png`

## 5. Produto

### Ja existe

- Landing page em `/`.
- Paginas publicas:
  - `/para-pacientes`
  - `/para-profissionais`
  - `/planos`
  - `/privacidade`
- Onboarding em `/onboarding`.
- Score recalibrado em `risk-score`.
- Resultado inicial em `/relatorio`.
- Painel principal em `/painel`.
- Meu Risco em `/meu-risco`.
- Check-in em `/check-in`.
- Historico em `/historico`.
- Missoes em `/missoes`.
- Plano de acao em `/plano-acao`.
- Conquistas em `/conquistas`.
- PWA:
  - `manifest.json`
  - service worker
  - icones 192 e 512
  - banner de instalacao no app
- Bottom navigation mobile.
- Atalhos rapidos na home.
- Sistema de pontos/missoes/streak em segundo plano.

### Parcial

- A experiencia ainda tem algumas rotas legadas da fase de clinicas/B2B em `src/routes/_authenticated`.
- Algumas telas antigas convivem com telas novas, o que pode gerar duplicidade de caminho.
- A home, Meu Risco, Perfil e Missoes ja foram redesenhadas varias vezes; falta uma passada final de consistencia visual.
- Missao/gamificacao ja existe, mas a nova direcao e manter isso discreto e concentrado em Missoes.

### Falta / proximo

- Fazer auditoria final de navegacao:
  - todo botao abre uma tela real
  - nenhuma tela vazia
  - remover duplicatas
  - consolidar caminhos antigos
- Fechar design system unico:
  - cores
  - cards
  - tipografia
  - bottom nav
  - estados vazios
- Criar fluxo final do leitor de exames, que agora e o maior diferencial do produto.
- Fazer QA mobile real em iPhone/Android.
- Revisar deploy Vercel e variaveis de ambiente.

### Arquivos principais

- `src/routes/index.tsx`
- `src/routes/onboarding.tsx`
- `src/routes/relatorio.tsx`
- `src/routes/painel.tsx`
- `src/routes/meu-risco.tsx`
- `src/routes/check-in.tsx`
- `src/routes/historico.tsx`
- `src/routes/missoes.tsx`
- `src/routes/plano-acao.tsx`
- `src/routes/conquistas.tsx`
- `src/components/MobileAppNav.tsx`
- `src/components/SiteFooter.tsx`
- `src/lib/risk-score.ts`
- `src/lib/challenge.ts`
- `src/lib/points.ts`
- `src/lib/user-activity.ts`
- `public/manifest.json`
- `public/sw.js`

## Prioridade recomendada

1. Leitor de exames com IA/OCR, porque e o principal diferencial novo.
2. Fila admin/medico para revisar exames enviados.
3. Auditoria final de botoes e rotas duplicadas.
4. Consolidacao visual do app mobile.
5. Fortalecer conta, seguranca, privacidade e exportacao/exclusao de dados.

