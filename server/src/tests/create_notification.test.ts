
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable, organisationsTable, usersTable, leadsTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { createNotification } from '../handlers/create_notification';
import { eq } from 'drizzle-orm';

describe('createNotification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let organisationId: number;
  let userId: number;
  let leadId: number;

  beforeEach(async () => {
    // Create organization first
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();
    organisationId = orgResult[0].id;

    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: organisationId
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create lead
    const leadResult = await db.insert(leadsTable)
      .values({
        name: 'Test Lead',
        email: 'lead@example.com',
        phone: '123-456-7890',
        insurance_types: ['life', 'auto'],
        source: 'referral',
        estimated_value: '5000.00',
        organisation_id: organisationId,
        assigned_broker_id: userId
      })
      .returning()
      .execute();
    leadId = leadResult[0].id;
  });

  const testInput: CreateNotificationInput = {
    type: 'lead_assignment',
    title: 'New Lead Assigned',
    message: 'You have been assigned a new lead',
    user_id: 0, // Will be set in test
    lead_id: 0  // Will be set in test
  };

  it('should create a notification', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      lead_id: leadId
    };

    const result = await createNotification(input);

    // Basic field validation
    expect(result.type).toEqual('lead_assignment');
    expect(result.title).toEqual('New Lead Assigned');
    expect(result.message).toEqual('You have been assigned a new lead');
    expect(result.user_id).toEqual(userId);
    expect(result.lead_id).toEqual(leadId);
    expect(result.is_read).toEqual(false);
    expect(result.sent_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save notification to database', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      lead_id: leadId
    };

    const result = await createNotification(input);

    // Query using proper drizzle syntax
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toEqual('lead_assignment');
    expect(notifications[0].title).toEqual('New Lead Assigned');
    expect(notifications[0].message).toEqual('You have been assigned a new lead');
    expect(notifications[0].user_id).toEqual(userId);
    expect(notifications[0].lead_id).toEqual(leadId);
    expect(notifications[0].is_read).toEqual(false);
    expect(notifications[0].sent_at).toBeNull();
    expect(notifications[0].created_at).toBeInstanceOf(Date);
  });

  it('should create notification without lead_id', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      lead_id: null
    };

    const result = await createNotification(input);

    expect(result.type).toEqual('lead_assignment');
    expect(result.title).toEqual('New Lead Assigned');
    expect(result.message).toEqual('You have been assigned a new lead');
    expect(result.user_id).toEqual(userId);
    expect(result.lead_id).toBeNull();
    expect(result.is_read).toEqual(false);
    expect(result.sent_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create different notification types', async () => {
    const dueDateInput = {
      type: 'due_date_reminder' as const,
      title: 'Due Date Reminder',
      message: 'Lead due date is approaching',
      user_id: userId,
      lead_id: leadId
    };

    const result = await createNotification(dueDateInput);

    expect(result.type).toEqual('due_date_reminder');
    expect(result.title).toEqual('Due Date Reminder');
    expect(result.message).toEqual('Lead due date is approaching');
    expect(result.user_id).toEqual(userId);
    expect(result.lead_id).toEqual(leadId);
  });
});
