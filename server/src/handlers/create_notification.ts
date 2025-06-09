
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type CreateNotificationInput, type Notification } from '../schema';

export const createNotification = async (input: CreateNotificationInput): Promise<Notification> => {
  try {
    // Insert notification record
    const result = await db.insert(notificationsTable)
      .values({
        type: input.type,
        title: input.title,
        message: input.message,
        user_id: input.user_id,
        lead_id: input.lead_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Notification creation failed:', error);
    throw error;
  }
};
