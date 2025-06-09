
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, notificationsTable } from '../db/schema';
import { markNotificationRead } from '../handlers/mark_notification_read';
import { eq } from 'drizzle-orm';

describe('markNotificationRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark notification as read', async () => {
    // Create prerequisite data
    const org = await db.insert(organisationsTable)
      .values({ name: 'Test Org', description: null })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'broker',
        organisation_id: org[0].id,
      })
      .returning()
      .execute();

    const notification = await db.insert(notificationsTable)
      .values({
        type: 'lead_assignment',
        title: 'New Lead Assigned',
        message: 'You have been assigned a new lead',
        user_id: user[0].id,
        lead_id: null,
        is_read: false,
        sent_at: null,
      })
      .returning()
      .execute();

    // Mark notification as read
    const result = await markNotificationRead(notification[0].id);

    // Verify notification is marked as read
    expect(result.id).toEqual(notification[0].id);
    expect(result.is_read).toBe(true);
    expect(result.sent_at).toBeInstanceOf(Date);
    expect(result.type).toEqual('lead_assignment');
    expect(result.title).toEqual('New Lead Assigned');
    expect(result.message).toEqual('You have been assigned a new lead');
    expect(result.user_id).toEqual(user[0].id);
  });

  it('should update notification in database', async () => {
    // Create prerequisite data
    const org = await db.insert(organisationsTable)
      .values({ name: 'Test Org', description: null })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin',
        organisation_id: org[0].id,
      })
      .returning()
      .execute();

    const notification = await db.insert(notificationsTable)
      .values({
        type: 'status_change',
        title: 'Lead Status Updated',
        message: 'Lead status has been changed',
        user_id: user[0].id,
        lead_id: null,
        is_read: false,
        sent_at: null,
      })
      .returning()
      .execute();

    // Mark notification as read
    await markNotificationRead(notification[0].id);

    // Verify database was updated
    const updatedNotification = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notification[0].id))
      .execute();

    expect(updatedNotification).toHaveLength(1);
    expect(updatedNotification[0].is_read).toBe(true);
    expect(updatedNotification[0].sent_at).toBeInstanceOf(Date);
    expect(updatedNotification[0].type).toEqual('status_change');
  });

  it('should throw error for non-existent notification', async () => {
    await expect(markNotificationRead(999)).rejects.toThrow(/not found/i);
  });

  it('should handle already read notification', async () => {
    // Create prerequisite data
    const org = await db.insert(organisationsTable)
      .values({ name: 'Test Org', description: null })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'view_only',
        organisation_id: org[0].id,
      })
      .returning()
      .execute();

    const existingSentAt = new Date('2023-01-01T10:00:00Z');
    const notification = await db.insert(notificationsTable)
      .values({
        type: 'document_upload',
        title: 'Document Uploaded',
        message: 'A new document has been uploaded',
        user_id: user[0].id,
        lead_id: null,
        is_read: true,
        sent_at: existingSentAt,
      })
      .returning()
      .execute();

    // Mark already read notification as read again
    const result = await markNotificationRead(notification[0].id);

    // Should still work and update sent_at
    expect(result.is_read).toBe(true);
    expect(result.sent_at).toBeInstanceOf(Date);
    expect(result.sent_at).not.toEqual(existingSentAt);
    expect(result.type).toEqual('document_upload');
  });
});
