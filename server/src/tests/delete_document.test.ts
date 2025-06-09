
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, organisationsTable, usersTable, leadsTable } from '../db/schema';
import { deleteDocument } from '../handlers/delete_document';
import { eq } from 'drizzle-orm';

describe('deleteDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a document', async () => {
    // Create prerequisite data
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'A test organisation'
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'broker',
        organisation_id: organisation.id
      })
      .returning()
      .execute();

    const [lead] = await db.insert(leadsTable)
      .values({
        name: 'Test Lead',
        email: 'lead@example.com',
        phone: '123-456-7890',
        insurance_types: ['life', 'auto'],
        source: 'referral',
        estimated_value: '5000.00',
        organisation_id: organisation.id,
        assigned_broker_id: user.id
      })
      .returning()
      .execute();

    const [document] = await db.insert(documentsTable)
      .values({
        filename: 'test-document.pdf',
        original_filename: 'original-document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        lead_id: lead.id,
        uploaded_by_user_id: user.id
      })
      .returning()
      .execute();

    // Delete the document
    await deleteDocument(document.id);

    // Verify document was deleted
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document.id))
      .execute();

    expect(documents).toHaveLength(0);
  });

  it('should not throw error when deleting non-existent document', async () => {
    // Attempt to delete a document that doesn't exist - should complete without error
    const result = await deleteDocument(999);
    expect(result).toBeUndefined();
  });

  it('should delete only the specified document', async () => {
    // Create prerequisite data
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'A test organisation'
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'broker',
        organisation_id: organisation.id
      })
      .returning()
      .execute();

    const [lead] = await db.insert(leadsTable)
      .values({
        name: 'Test Lead',
        email: 'lead@example.com',
        phone: '123-456-7890',
        insurance_types: ['life', 'auto'],
        source: 'referral',
        estimated_value: '5000.00',
        organisation_id: organisation.id,
        assigned_broker_id: user.id
      })
      .returning()
      .execute();

    // Create two documents
    const [document1] = await db.insert(documentsTable)
      .values({
        filename: 'test-document-1.pdf',
        original_filename: 'original-document-1.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        lead_id: lead.id,
        uploaded_by_user_id: user.id
      })
      .returning()
      .execute();

    const [document2] = await db.insert(documentsTable)
      .values({
        filename: 'test-document-2.pdf',
        original_filename: 'original-document-2.pdf',
        file_size: 2048,
        mime_type: 'application/pdf',
        lead_id: lead.id,
        uploaded_by_user_id: user.id
      })
      .returning()
      .execute();

    // Delete only the first document
    await deleteDocument(document1.id);

    // Verify first document was deleted
    const deletedDocument = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document1.id))
      .execute();

    expect(deletedDocument).toHaveLength(0);

    // Verify second document still exists
    const remainingDocument = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document2.id))
      .execute();

    expect(remainingDocument).toHaveLength(1);
    expect(remainingDocument[0].filename).toEqual('test-document-2.pdf');
  });
});
