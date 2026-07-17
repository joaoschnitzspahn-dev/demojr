/**
 * Camada de integrações futuras.
 * Mantida vazia de propósito — contratos serão definidos quando
 * houver backend (PostgreSQL / API REST) e conectores externos.
 *
 * Planejado:
 * - Prontosoft
 * - WhatsApp
 * - Importação de IMEIs (Excel)
 * - Geração de PDFs
 * - Notificações / auditoria
 */

export type IntegrationStatus = 'planned' | 'ready' | 'active'

export const INTEGRATIONS_ROADMAP = [
  'auth_permissions',
  'postgresql',
  'rest_api',
  'prontosoft',
  'whatsapp',
  'imei_excel_import',
  'pdf_generation',
  'reports',
  'productivity_dashboard',
  'notifications',
  'audit_log',
] as const
