
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, leadsTable, documentsTable } from '../db/schema';
import { getDocumentsByLead } from '../handlers/get_documents_by_lead';

describe('getDocumentsByLead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return documents for a lead', async () => {
    // Create prerequisite data
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test Description'
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
        insurance_types: ['life', 'health'],
        source: 'referral',
        estimated_value: '1000.00',
        organisation_id: organisation.id,
        assigned_broker_id: user.id
      })
      .returning()
      .execute();

    // Create test documents
    const [document1] = await db.insert(documentsTable)
      .values({
        filename: 'test-file-1.pdf',
        original_filename: 'Test Document 1.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        lead_id: lead.id,
        uploaded_by_user_id: user.id
      })
      .returning()
      .execute();

    const [document2] = await db.insert(documentsTable)
      .values({
        filename: 'test-file-2.docx',
        original_filename: 'Test Document 2.docx',
        file_size: 2048,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        lead_id: lead.id,
        uploaded_by_user_id: user.id
      })
      .returning()
      .execute();

    const result = await getDocumentsByLead(lead.id);

    expect(result).toHaveLength(2);
    
    // Verify first document
    const doc1 = result.find(d => d.id === document1.id);
    expect(doc1).toBeDefined();
    expect(doc1!.filename).toEqual('test-file-1.pdf');
    expect(doc1!.original_filename).toEqual('Test Document 1.pdf');
    expect(doc1!.file_size).toEqual(1024);
    expect(doc1!.mime_type).toEqual('application/pdf');
    expect(doc1!.lead_id).toEqual(lead.id);
    expect(doc1!.uploaded_by_user_id).toEqual(user.id);
    expect(doc1!.created_at).toBeInstanceOf(Date);

    // Verify second document
    const doc2 = result.find(d => d.id === document2.id);
    expect(doc2).toBeDefined();
    expect(doc2!.filename).toEqual('test-file-2.docx');
    expect(doc2!.original_filename).toEqual('Test Document 2.docx');
    expect(doc2!.file_size).toEqual(2048);
    expect(doc2!.mime_type).toEqual('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(doc2!.lead_id).toEqual(lead.id);
    expect(doc2!.uploaded_by_user_id).toEqual(user.id);
    expect(doc2!.created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when lead has no documents', async () => {
    // Create prerequisite data
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test Description'
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
        insurance_types: ['life'],
        source: 'website',
        estimated_value: '500.00',
        organisation_id: organisation.id,
        assigned_broker_id: user.id
      })
      .returning()
      .execute();

    const result = await getDocumentsByLead(lead.id);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent lead', async () => {
    const result = await getDocumentsByLead(99999);

    expect(result).toHaveLength(0);
  });

  it('should only return documents for the specified lead', async () => {
    // Create prerequisite data
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test Description'
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

    // Create two leads
    const [lead1] = await db.insert(leadsTable)
      .values({
        name: 'Test Lead 1',
        email: 'lead1@example.com',
        insurance_types: ['life'],
        source: 'referral',
        estimated_value: '1000.00',
        organisation_id: organisation.id,
        assigned_broker_id: user.id
      })
      .returning()
      .execute();

    const [lead2] = await db.insert(leadsTable)
      .values({
        name: 'Test Lead 2',
        email: 'lead2@example.com',
        insurance_types: ['auto'],
        source: 'website',
        estimated_value: '2000.00',
        organisation_id: organisation.id,
        assigned_broker_id: user.id
      })
      .returning()
      .execute();

    // Create documents for both leads
    await db.insert(documentsTable)
      .values({
        filename: 'lead1-doc.pdf',
        original_filename: 'Lead 1 Document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        lead_id: lead1.id,
        uploaded_by_user_id: user.id
      })
      .execute();

    await db.insert(documentsTable)
      .values({
        filename: 'lead2-doc.pdf',
        original_filename: 'Lead 2 Document.pdf',
        file_size: 2048,
        mime_type: 'application/pdf',
        lead_id: lead2.id,
        uploaded_by_user_id: user.id
      })
      .execute();

    // Get documents for lead1 only
    const result = await getDocumentsByLead(lead1.id);

    expect(result).toHaveLength(1);
    expect(result[0].filename).toEqual('lead1-doc.pdf');
    expect(result[0].lead_id).toEqual(lead1.id);
  });
});
