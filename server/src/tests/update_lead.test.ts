
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, leadsTable } from '../db/schema';
import { type UpdateLeadInput, type CreateOrganisationInput, type CreateUserInput, type CreateLeadInput } from '../schema';
import { updateLead } from '../handlers/update_lead';
import { eq } from 'drizzle-orm';

// Test data setup
const testOrganisation: CreateOrganisationInput = {
  name: 'Test Insurance Co',
  description: 'Test organisation for lead updates'
};

const testUser: CreateUserInput = {
  email: 'broker@test.com',
  first_name: 'Test',
  last_name: 'Broker',
  role: 'broker',
  organisation_id: 1 // Will be set after organisation creation
};

const testLead: CreateLeadInput = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  insurance_types: ['life', 'health'],
  source: 'website',
  estimated_value: 5000,
  notes: 'Initial lead notes',
  due_date: new Date('2024-12-31'),
  organisation_id: 1, // Will be set after organisation creation
  assigned_broker_id: null,
  parent_lead_id: null
};

describe('updateLead', () => {
  let organisationId: number;
  let brokerId: number;
  let leadId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create organisation
    const orgResult = await db.insert(organisationsTable)
      .values(testOrganisation)
      .returning()
      .execute();
    organisationId = orgResult[0].id;

    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        organisation_id: organisationId
      })
      .returning()
      .execute();
    brokerId = userResult[0].id;

    // Create lead
    const leadResult = await db.insert(leadsTable)
      .values({
        ...testLead,
        organisation_id: organisationId,
        estimated_value: testLead.estimated_value.toString()
      })
      .returning()
      .execute();
    leadId = leadResult[0].id;
  });

  afterEach(resetDB);

  it('should update lead basic fields', async () => {
    const updateInput: UpdateLeadInput = {
      id: leadId,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+0987654321'
    };

    const result = await updateLead(updateInput);

    expect(result.id).toEqual(leadId);
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane@example.com');
    expect(result.phone).toEqual('+0987654321');
    expect(result.insurance_types).toEqual(['life', 'health']); // Unchanged
    expect(result.estimated_value).toEqual(5000); // Unchanged
    expect(typeof result.estimated_value).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update lead status and broker assignment', async () => {
    const updateInput: UpdateLeadInput = {
      id: leadId,
      status: 'qualified',
      assigned_broker_id: brokerId
    };

    const result = await updateLead(updateInput);

    expect(result.id).toEqual(leadId);
    expect(result.status).toEqual('qualified');
    expect(result.assigned_broker_id).toEqual(brokerId);
    expect(result.name).toEqual('John Doe'); // Unchanged
    expect(result.estimated_value).toEqual(5000); // Unchanged
    expect(typeof result.estimated_value).toBe('number');
  });

  it('should update estimated value correctly', async () => {
    const updateInput: UpdateLeadInput = {
      id: leadId,
      estimated_value: 7500.50
    };

    const result = await updateLead(updateInput);

    expect(result.id).toEqual(leadId);
    expect(result.estimated_value).toEqual(7500.50);
    expect(typeof result.estimated_value).toBe('number');
  });

  it('should update insurance types array', async () => {
    const updateInput: UpdateLeadInput = {
      id: leadId,
      insurance_types: ['auto', 'home', 'business']
    };

    const result = await updateLead(updateInput);

    expect(result.id).toEqual(leadId);
    expect(result.insurance_types).toEqual(['auto', 'home', 'business']);
    expect(Array.isArray(result.insurance_types)).toBe(true);
  });

  it('should update nullable fields to null', async () => {
    const updateInput: UpdateLeadInput = {
      id: leadId,
      email: null,
      phone: null,
      notes: null,
      due_date: null,
      assigned_broker_id: null
    };

    const result = await updateLead(updateInput);

    expect(result.id).toEqual(leadId);
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.assigned_broker_id).toBeNull();
  });

  it('should save changes to database', async () => {
    const updateInput: UpdateLeadInput = {
      id: leadId,
      name: 'Updated Lead Name',
      status: 'converted',
      estimated_value: 10000
    };

    await updateLead(updateInput);

    // Verify changes were saved
    const leads = await db.select()
      .from(leadsTable)
      .where(eq(leadsTable.id, leadId))
      .execute();

    expect(leads).toHaveLength(1);
    expect(leads[0].name).toEqual('Updated Lead Name');
    expect(leads[0].status).toEqual('converted');
    expect(parseFloat(leads[0].estimated_value)).toEqual(10000);
    expect(leads[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent lead', async () => {
    const updateInput: UpdateLeadInput = {
      id: 99999,
      name: 'Non-existent Lead'
    };

    await expect(updateLead(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const updateInput: UpdateLeadInput = {
      id: leadId,
      notes: 'Updated notes only'
    };

    const result = await updateLead(updateInput);

    expect(result.id).toEqual(leadId);
    expect(result.notes).toEqual('Updated notes only');
    expect(result.name).toEqual('John Doe'); // Unchanged
    expect(result.email).toEqual('john@example.com'); // Unchanged
    expect(result.estimated_value).toEqual(5000); // Unchanged
    expect(typeof result.estimated_value).toBe('number');
  });
});
