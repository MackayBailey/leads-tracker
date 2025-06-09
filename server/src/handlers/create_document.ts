
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type CreateDocumentInput, type Document } from '../schema';

export const createDocument = async (input: CreateDocumentInput): Promise<Document> => {
  try {
    // Insert document record
    const result = await db.insert(documentsTable)
      .values({
        filename: input.filename,
        original_filename: input.original_filename,
        file_size: input.file_size,
        mime_type: input.mime_type,
        lead_id: input.lead_id,
        uploaded_by_user_id: input.uploaded_by_user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Document creation failed:', error);
    throw error;
  }
};
