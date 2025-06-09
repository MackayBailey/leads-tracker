
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, leadsTable, notificationsTable } from '../db/schema';
import { type GetNotificationsByUserInput } from '../schema';
import { getNotificationsByUser } from '../handlers/get_notifications_by_user';

describe('getNotificationsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get notifications for a user', async () => {
    // Create prerequisite data
    const org = await db.insert(organisationsTable)
      .values({ name: 'Test Org', description: 'Test Description' })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: org[0].id,
      })
      .returning()
      .execute();

    const lead = await db.insert(leadsTable)
      .values({
        name: 'Test Lead',
        insurance_types: JSON.stringify(['life']),
        source: 'referral',
        estimated_value: '1000.00',
        organisation_id: org[0].id,
      })
      .returning()
      .execute();

    // Create test notifications
    await db.insert(notificationsTable)
      .values([
        {
          type: 'lead_assignment',
          title: 'New Lead Assigned',
          message: 'A new lead has been assigned to you',
          user_id: user[0].id,
          lead_id: lead[0].id,
        },
        {
          type: 'due_date_reminder',
          title: 'Due Date Reminder',
          message: 'Lead due date approaching',
          user_id: user[0].id,
          lead_id: lead[0].id,
          is_read: true,
        },
      ])
      .execute();

    const input: GetNotificationsByUserInput = {
      user_id: user[0].id,
      limit: 50,
      offset: 0,
    };

    const result = await getNotificationsByUser(input);

    expect(result).toHaveLength(2);
    
    // Check that all notifications belong to the user
    result.forEach(notification => {
      expect(notification.user_id).toEqual(user[0].id);
    });

    // Check that we have both notification types
    const notificationTypes = result.map(n => n.type);
    expect(notificationTypes).toContain('lead_assignment');
    expect(notificationTypes).toContain('due_date_reminder');

    // Check that we have both notification titles
    const notificationTitles = result.map(n => n.title);
    expect(notificationTitles).toContain('New Lead Assigned');
    expect(notificationTitles).toContain('Due Date Reminder');

    // Check that the read notification is marked as read
    const readNotification = result.find(n => n.type === 'due_date_reminder');
    expect(readNotification?.is_read).toEqual(true);

    // Check that the unread notification is marked as unread
    const unreadNotification = result.find(n => n.type === 'lead_assignment');
    expect(unreadNotification?.is_read).toEqual(false);
  });

  it('should filter by read status', async () => {
    // Create prerequisite data
    const org = await db.insert(organisationsTable)
      .values({ name: 'Test Org', description: 'Test Description' })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: org[0].id,
      })
      .returning()
      .execute();

    // Create notifications with different read statuses
    await db.insert(notificationsTable)
      .values([
        {
          type: 'lead_assignment',
          title: 'Unread Notification',
          message: 'This is unread',
          user_id: user[0].id,
          is_read: false,
        },
        {
          type: 'due_date_reminder',
          title: 'Read Notification',
          message: 'This is read',
          user_id: user[0].id,
          is_read: true,
        },
      ])
      .execute();

    // Test filtering for unread notifications
    const unreadInput: GetNotificationsByUserInput = {
      user_id: user[0].id,
      is_read: false,
      limit: 50,
      offset: 0,
    };

    const unreadResult = await getNotificationsByUser(unreadInput);

    expect(unreadResult).toHaveLength(1);
    expect(unreadResult[0].title).toEqual('Unread Notification');
    expect(unreadResult[0].is_read).toEqual(false);

    // Test filtering for read notifications
    const readInput: GetNotificationsByUserInput = {
      user_id: user[0].id,
      is_read: true,
      limit: 50,
      offset: 0,
    };

    const readResult = await getNotificationsByUser(readInput);

    expect(readResult).toHaveLength(1);
    expect(readResult[0].title).toEqual('Read Notification');
    expect(readResult[0].is_read).toEqual(true);
  });

  it('should apply pagination correctly', async () => {
    // Create prerequisite data
    const org = await db.insert(organisationsTable)
      .values({ name: 'Test Org', description: 'Test Description' })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: org[0].id,
      })
      .returning()
      .execute();

    // Create multiple notifications
    const notifications = Array.from({ length: 5 }, (_, i) => ({
      type: 'lead_assignment' as const,
      title: `Notification ${i + 1}`,
      message: `Message ${i + 1}`,
      user_id: user[0].id,
    }));

    await db.insert(notificationsTable)
      .values(notifications)
      .execute();

    // Test first page
    const firstPageInput: GetNotificationsByUserInput = {
      user_id: user[0].id,
      limit: 2,
      offset: 0,
    };

    const firstPageResult = await getNotificationsByUser(firstPageInput);

    expect(firstPageResult).toHaveLength(2);

    // Test second page
    const secondPageInput: GetNotificationsByUserInput = {
      user_id: user[0].id,
      limit: 2,
      offset: 2,
    };

    const secondPageResult = await getNotificationsByUser(secondPageInput);

    expect(secondPageResult).toHaveLength(2);

    // Ensure different results
    expect(firstPageResult[0].id).not.toEqual(secondPageResult[0].id);
  });

  it('should return empty array for user with no notifications', async () => {
    // Create prerequisite data
    const org = await db.insert(organisationsTable)
      .values({ name: 'Test Org', description: 'Test Description' })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: org[0].id,
      })
      .returning()
      .execute();

    const input: GetNotificationsByUserInput = {
      user_id: user[0].id,
      limit: 50,
      offset: 0,
    };

    const result = await getNotificationsByUser(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});
