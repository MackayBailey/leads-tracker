
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type GetNotificationsByUserInput, type Notification } from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const getNotificationsByUser = async (input: GetNotificationsByUserInput): Promise<Notification[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(notificationsTable.user_id, input.user_id)
    ];

    // Add optional filters
    if (input.is_read !== undefined) {
      conditions.push(eq(notificationsTable.is_read, input.is_read));
    }

    // Execute query with all conditions applied at once
    const results = await db.select()
      .from(notificationsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(notificationsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Get notifications by user failed:', error);
    throw error;
  }
};
