# Fluxo de Solicitação de Exame HTCare

## Fase atual: semi-manual

1. O paciente solicita o exame em `Meu Risco`.
2. A solicitação é salva em `exam_requests` com status `aguardando_autorizacao`.
3. O médico parceiro acessa `/medico`, revisa score, fatores de risco, cidade e WhatsApp.
4. O médico autoriza ou pede mais informações.
5. O contato com o paciente ainda é manual por WhatsApp.
6. Quando autorizado, o paciente vê as instruções de agendamento e pode enviar PDF ou imagem do resultado.
7. O status muda para `resultado_recebido` após upload.

## Fase 2

- Notificação automática no app quando o médico autorizar.
- Integração direta com agenda do laboratório parceiro.
- Processamento do resultado por IA para interpretar biomarcadores.
- Recálculo automático do score usando dados reais do exame.
