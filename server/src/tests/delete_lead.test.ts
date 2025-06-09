
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { leadsTable, organisationsTable, usersTable } from '../db/schema';
import { deleteLead } from '../handlers/delete_lead';
import { eq } from 'drizzle-orm';

describe('deleteLead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a lead successfully', async () => {
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
        email: 'broker@example.com',
        first_name: 'Test',
        last_name: 'Broker',
        role: 'broker',
        organisation_id: organisation.id
      })
      .returning()
      .execute();

    // Create test lead
    const [lead] = await db.insert(leadsTable)
      .values({
        name: 'Test Lead',
        email: 'lead@example.com',
        phone: '1234567890',
        insurance_types: ['life', 'auto'],
        source: 'website',
        estimated_value: '10000.00',
        notes: 'Test notes',
        organisation_id: organisation.id,
        assigned_broker_id: user.id
      })
      .returning()
      .execute();

    // Verify lead exists before deletion
    const leadsBefore = await db.select()
      .from(leadsTable)
      .where(eq(leadsTable.id, lead.id))
      .execute();
    expect(leadsBefore).toHaveLength(1);

    // Delete the lead
    await deleteLead(lead.id);

    // Verify lead no longer exists
    const leadsAfter = await db.select()
      .from(leadsTable)
      .where(eq(leadsTable.id, lead.id))
      .execute();
    expect(leadsAfter).toHaveLength(0);
  });

  it('should not throw error when deleting non-existent lead', async () => {
    const nonExistentId = 999999;

    // Should not throw an error
    await expect(deleteLead(nonExistentId)).resolves.toBeUndefined();
  });

  it('should delete only the specified lead', async () => {
    // Create prerequisite data
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'A test organisation'
      })
      .returning()
      .execute();

    // Create multiple leads
    const [lead1] = await db.insert(leadsTable)
      .values({
        name: 'Lead 1',
        email: 'lead1@example.com',
        insurance_types: ['life'],
        source: 'website',
        estimated_value: '5000.00',
        organisation_id: organisation.id
      })
      .returning()
      .execute();

    const [lead2] = await db.insert(leadsTable)
      .values({
        name: 'Lead 2',
        email: 'lead2@example.com',
        insurance_types: ['auto'],
        source: 'referral',
        estimated_value: '8000.00',
        organisation_id: organisation.id
      })
      .returning()
      .execute();

    // Delete only lead1
    await deleteLead(lead1.id);

    // Verify lead1 is deleted
    const deletedLead = await db.select()
      .from(leadsTable)
      .where(eq(leadsTable.id, lead1.id))
      .execute();
    expect(deletedLead).toHaveLength(0);

    // Verify lead2 still exists
    const remainingLead = await db.select()
      .from(leadsTable)
      .where(eq(leadsTable.id, lead2.id))
      .execute();
    expect(remainingLead).toHaveLength(1);
    expect(remainingLead[0].name).toEqual('Lead 2');
  });
});
