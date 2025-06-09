
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type Notification } from '../schema';
import { eq } from 'drizzle-orm';

export const markNotificationRead = async (id: number): Promise<Notification> => {
  try {
    // Update notification to mark as read
    const result = await db.update(notificationsTable)
      .set({ 
        is_read: true,
        sent_at: new Date() // Set sent_at when marking as read
      })
      .where(eq(notificationsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Notification with id ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
};
