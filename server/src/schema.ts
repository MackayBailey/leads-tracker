
import { z } from 'zod';

// Enums
export const userRoleEnum = z.enum(['admin', 'broker', 'view_only']);
export type UserRole = z.infer<typeof userRoleEnum>;

export const leadStatusEnum = z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']);
export type LeadStatus = z.infer<typeof leadStatusEnum>;

export const leadSourceEnum = z.enum(['referral', 'website', 'cold_call', 'social_media', 'advertisement', 'other']);
export type LeadSource = z.infer<typeof leadSourceEnum>;

export const insuranceTypeEnum = z.enum(['life', 'auto', 'health', 'home', 'business', 'travel', 'disability']);
export type InsuranceType = z.infer<typeof insuranceTypeEnum>;

export const notificationTypeEnum = z.enum(['due_date_reminder', 'lead_assignment', 'status_change', 'document_upload']);
export type NotificationType = z.infer<typeof notificationTypeEnum>;

// Organisation schemas
export const organisationSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Organisation = z.infer<typeof organisationSchema>;

export const createOrganisationInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
});

export type CreateOrganisationInput = z.infer<typeof createOrganisationInputSchema>;

export const updateOrganisationInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export type UpdateOrganisationInput = z.infer<typeof updateOrganisationInputSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleEnum,
  organisation_id: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleEnum,
  organisation_id: z.number(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: userRoleEnum.optional(),
  organisation_id: z.number().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Lead schemas
export const leadSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  insurance_types: z.array(insuranceTypeEnum),
  status: leadStatusEnum,
  source: leadSourceEnum,
  estimated_value: z.number(),
  notes: z.string().nullable(),
  due_date: z.coerce.date().nullable(),
  organisation_id: z.number(),
  assigned_broker_id: z.number().nullable(),
  parent_lead_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Lead = z.infer<typeof leadSchema>;

export const createLeadInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  insurance_types: z.array(insuranceTypeEnum).min(1),
  source: leadSourceEnum,
  estimated_value: z.number().nonnegative(),
  notes: z.string().nullable(),
  due_date: z.coerce.date().nullable(),
  organisation_id: z.number(),
  assigned_broker_id: z.number().nullable(),
  parent_lead_id: z.number().nullable(),
});

export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;

export const updateLeadInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  insurance_types: z.array(insuranceTypeEnum).min(1).optional(),
  status: leadStatusEnum.optional(),
  source: leadSourceEnum.optional(),
  estimated_value: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  assigned_broker_id: z.number().nullable().optional(),
  parent_lead_id: z.number().nullable().optional(),
});

export type UpdateLeadInput = z.infer<typeof updateLeadInputSchema>;

// Document schemas
export const documentSchema = z.object({
  id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  lead_id: z.number(),
  uploaded_by_user_id: z.number(),
  created_at: z.coerce.date(),
});

export type Document = z.infer<typeof documentSchema>;

export const createDocumentInputSchema = z.object({
  filename: z.string(),
  original_filename: z.string(),
  file_size: z.number().positive(),
  mime_type: z.string(),
  lead_id: z.number(),
  uploaded_by_user_id: z.number(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>;

// Notification schemas
export const notificationSchema = z.object({
  id: z.number(),
  type: notificationTypeEnum,
  title: z.string(),
  message: z.string(),
  user_id: z.number(),
  lead_id: z.number().nullable(),
  is_read: z.boolean(),
  sent_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const createNotificationInputSchema = z.object({
  type: notificationTypeEnum,
  title: z.string(),
  message: z.string(),
  user_id: z.number(),
  lead_id: z.number().nullable(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;

// Query input schemas
export const getLeadsByOrganisationInputSchema = z.object({
  organisation_id: z.number(),
  status: leadStatusEnum.optional(),
  assigned_broker_id: z.number().nullable().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type GetLeadsByOrganisationInput = z.infer<typeof getLeadsByOrganisationInputSchema>;

export const getUsersByOrganisationInputSchema = z.object({
  organisation_id: z.number(),
  role: userRoleEnum.optional(),
  is_active: z.boolean().optional(),
});

export type GetUsersByOrganisationInput = z.infer<typeof getUsersByOrganisationInputSchema>;

export const getNotificationsByUserInputSchema = z.object({
  user_id: z.number(),
  is_read: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type GetNotificationsByUserInput = z.infer<typeof getNotificationsByUserInputSchema>;

// Report schemas
export const leadConversionReportSchema = z.object({
  organisation_id: z.number(),
  total_leads: z.number(),
  converted_leads: z.number(),
  conversion_rate: z.number(),
  total_estimated_value: z.number(),
  converted_value: z.number(),
  by_source: z.array(z.object({
    source: leadSourceEnum,
    total: z.number(),
    converted: z.number(),
    conversion_rate: z.number(),
  })),
  by_insurance_type: z.array(z.object({
    insurance_type: insuranceTypeEnum,
    total: z.number(),
    converted: z.number(),
    conversion_rate: z.number(),
  })),
});

export type LeadConversionReport = z.infer<typeof leadConversionReportSchema>;

export const brokerPerformanceReportSchema = z.object({
  broker_id: z.number(),
  broker_name: z.string(),
  total_leads: z.number(),
  converted_leads: z.number(),
  conversion_rate: z.number(),
  total_estimated_value: z.number(),
  converted_value: z.number(),
});

export type BrokerPerformanceReport = z.infer<typeof brokerPerformanceReportSchema>;

export const getReportsInputSchema = z.object({
  organisation_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
});

export type GetReportsInput = z.infer<typeof getReportsInputSchema>;
