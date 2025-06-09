
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, organisationsTable, usersTable, leadsTable } from '../db/schema';
import { type CreateDocumentInput } from '../schema';
import { createDocument } from '../handlers/create_document';
import { eq } from 'drizzle-orm';

describe('createDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const setupTestData = async () => {
    // Create organisation
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test description'
      })
      .returning()
      .execute();
    const organisation = orgResult[0];

    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'broker',
        organisation_id: organisation.id
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create lead
    const leadResult = await db.insert(leadsTable)
      .values({
        name: 'Test Lead',
        email: 'lead@example.com',
        phone: '123-456-7890',
        insurance_types: JSON.stringify(['life', 'auto']),
        source: 'website',
        estimated_value: '10000.00',
        organisation_id: organisation.id,
        assigned_broker_id: user.id
      })
      .returning()
      .execute();
    const lead = leadResult[0];

    return { organisation, user, lead };
  };

  it('should create a document', async () => {
    const { user, lead } = await setupTestData();

    const testInput: CreateDocumentInput = {
      filename: 'test-file-123.pdf',
      original_filename: 'test document.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      lead_id: lead.id,
      uploaded_by_user_id: user.id
    };

    const result = await createDocument(testInput);

    // Basic field validation
    expect(result.filename).toEqual('test-file-123.pdf');
    expect(result.original_filename).toEqual('test document.pdf');
    expect(result.file_size).toEqual(1024);
    expect(result.mime_type).toEqual('application/pdf');
    expect(result.lead_id).toEqual(lead.id);
    expect(result.uploaded_by_user_id).toEqual(user.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save document to database', async () => {
    const { user, lead } = await setupTestData();

    const testInput: CreateDocumentInput = {
      filename: 'saved-file.png',
      original_filename: 'image.png',
      file_size: 2048,
      mime_type: 'image/png',
      lead_id: lead.id,
      uploaded_by_user_id: user.id
    };

    const result = await createDocument(testInput);

    // Query database to verify document was saved
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].filename).toEqual('saved-file.png');
    expect(documents[0].original_filename).toEqual('image.png');
    expect(documents[0].file_size).toEqual(2048);
    expect(documents[0].mime_type).toEqual('image/png');
    expect(documents[0].lead_id).toEqual(lead.id);
    expect(documents[0].uploaded_by_user_id).toEqual(user.id);
    expect(documents[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different file types correctly', async () => {
    const { user, lead } = await setupTestData();

    const docInput: CreateDocumentInput = {
      filename: 'contract-v2.docx',
      original_filename: 'Insurance Contract v2.docx',
      file_size: 45678,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      lead_id: lead.id,
      uploaded_by_user_id: user.id
    };

    const result = await createDocument(docInput);

    expect(result.filename).toEqual('contract-v2.docx');
    expect(result.original_filename).toEqual('Insurance Contract v2.docx');
    expect(result.file_size).toEqual(45678);
    expect(result.mime_type).toEqual('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // Verify in database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].mime_type).toEqual('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('should create multiple documents for the same lead', async () => {
    const { user, lead } = await setupTestData();

    const doc1Input: CreateDocumentInput = {
      filename: 'policy-1.pdf',
      original_filename: 'Policy Document 1.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      lead_id: lead.id,
      uploaded_by_user_id: user.id
    };

    const doc2Input: CreateDocumentInput = {
      filename: 'policy-2.pdf',
      original_filename: 'Policy Document 2.pdf',
      file_size: 2048,
      mime_type: 'application/pdf',
      lead_id: lead.id,
      uploaded_by_user_id: user.id
    };

    const result1 = await createDocument(doc1Input);
    const result2 = await createDocument(doc2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.lead_id).toEqual(lead.id);
    expect(result2.lead_id).toEqual(lead.id);

    // Verify both documents exist in database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.lead_id, lead.id))
      .execute();

    expect(documents).toHaveLength(2);
    expect(documents.map(d => d.filename)).toContain('policy-1.pdf');
    expect(documents.map(d => d.filename)).toContain('policy-2.pdf');
  });
});
