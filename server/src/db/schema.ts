
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean, 
  pgEnum,
  jsonb,
  foreignKey,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'broker', 'view_only']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'converted', 'lost']);
export const leadSourceEnum = pgEnum('lead_source', ['referral', 'website', 'cold_call', 'social_media', 'advertisement', 'other']);
export const insuranceTypeEnum = pgEnum('insurance_type', ['life', 'auto', 'health', 'home', 'business', 'travel', 'disability']);
export const notificationTypeEnum = pgEnum('notification_type', ['due_date_reminder', 'lead_assignment', 'status_change', 'document_upload']);

// Tables
export const organisationsTable = pgTable('organisations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  organisation_id: integer('organisation_id').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  organisationIdx: index('users_organisation_idx').on(table.organisation_id),
  emailIdx: index('users_email_idx').on(table.email),
}));

export const leadsTable = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  insurance_types: jsonb('insurance_types').notNull(), // Array of insurance types
  status: leadStatusEnum('status').default('new').notNull(),
  source: leadSourceEnum('source').notNull(),
  estimated_value: numeric('estimated_value', { precision: 10, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  due_date: timestamp('due_date'),
  organisation_id: integer('organisation_id').notNull(),
  assigned_broker_id: integer('assigned_broker_id'),
  parent_lead_id: integer('parent_lead_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  organisationIdx: index('leads_organisation_idx').on(table.organisation_id),
  statusIdx: index('leads_status_idx').on(table.status),
  brokerIdx: index('leads_broker_idx').on(table.assigned_broker_id),
  dueDateIdx: index('leads_due_date_idx').on(table.due_date),
  parentLeadIdx: index('leads_parent_idx').on(table.parent_lead_id),
}));

export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  original_filename: text('original_filename').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  lead_id: integer('lead_id').notNull(),
  uploaded_by_user_id: integer('uploaded_by_user_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  leadIdx: index('documents_lead_idx').on(table.lead_id),
  uploaderIdx: index('documents_uploader_idx').on(table.uploaded_by_user_id),
}));

export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  user_id: integer('user_id').notNull(),
  lead_id: integer('lead_id'),
  is_read: boolean('is_read').default(false).notNull(),
  sent_at: timestamp('sent_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.user_id),
  readStatusIdx: index('notifications_read_idx').on(table.is_read),
  leadIdx: index('notifications_lead_idx').on(table.lead_id),
}));

// Relations
export const organisationsRelations = relations(organisationsTable, ({ many }) => ({
  users: many(usersTable),
  leads: many(leadsTable),
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  organisation: one(organisationsTable, {
    fields: [usersTable.organisation_id],
    references: [organisationsTable.id],
  }),
  assignedLeads: many(leadsTable, { relationName: 'broker' }),
  uploadedDocuments: many(documentsTable),
  notifications: many(notificationsTable),
}));

export const leadsRelations = relations(leadsTable, ({ one, many }) => ({
  organisation: one(organisationsTable, {
    fields: [leadsTable.organisation_id],
    references: [organisationsTable.id],
  }),
  assignedBroker: one(usersTable, {
    fields: [leadsTable.assigned_broker_id],
    references: [usersTable.id],
    relationName: 'broker',
  }),
  parentLead: one(leadsTable, {
    fields: [leadsTable.parent_lead_id],
    references: [leadsTable.id],
    relationName: 'parent',
  }),
  childLeads: many(leadsTable, { relationName: 'parent' }),
  documents: many(documentsTable),
  notifications: many(notificationsTable),
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  lead: one(leadsTable, {
    fields: [documentsTable.lead_id],
    references: [leadsTable.id],
  }),
  uploadedBy: one(usersTable, {
    fields: [documentsTable.uploaded_by_user_id],
    references: [usersTable.id],
  }),
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.user_id],
    references: [usersTable.id],
  }),
  lead: one(leadsTable, {
    fields: [notificationsTable.lead_id],
    references: [leadsTable.id],
  }),
}));

// Type exports
export type Organisation = typeof organisationsTable.$inferSelect;
export type NewOrganisation = typeof organisationsTable.$inferInsert;

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Lead = typeof leadsTable.$inferSelect;
export type NewLead = typeof leadsTable.$inferInsert;

export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  organisations: organisationsTable,
  users: usersTable,
  leads: leadsTable,
  documents: documentsTable,
  notifications: notificationsTable,
};
