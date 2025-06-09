
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { leadsTable, organisationsTable, usersTable } from '../db/schema';
import { type CreateLeadInput } from '../schema';
import { createLead } from '../handlers/create_lead';
import { eq } from 'drizzle-orm';

// Test prerequisite data
const testOrganisation = {
  name: 'Test Insurance Co',
  description: 'Test organisation'
};

const testBroker = {
  email: 'broker@test.com',
  first_name: 'John',
  last_name: 'Broker',
  role: 'broker' as const,
  organisation_id: 1
};

const testParentLead = {
  name: 'Parent Lead',
  email: 'parent@test.com',
  phone: '+1234567890',
  insurance_types: ['life', 'health'],
  source: 'referral' as const,
  estimated_value: '1000.00',
  organisation_id: 1
};

// Simple test input
const testInput: CreateLeadInput = {
  name: 'Test Lead',
  email: 'lead@test.com',
  phone: '+1234567890',
  insurance_types: ['life', 'auto'],
  source: 'website',
  estimated_value: 5000.50,
  notes: 'Test lead notes',
  due_date: new Date('2024-12-31'),
  organisation_id: 1,
  assigned_broker_id: 1,
  parent_lead_id: null
};

describe('createLead', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite organisation
    await db.insert(organisationsTable)
      .values(testOrganisation)
      .execute();
    
    // Create prerequisite broker
    await db.insert(usersTable)
      .values(testBroker)
      .execute();
  });
  
  afterEach(resetDB);

  it('should create a lead', async () => {
    const result = await createLead(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Lead');
    expect(result.email).toEqual('lead@test.com');
    expect(result.phone).toEqual('+1234567890');
    expect(result.insurance_types).toEqual(['life', 'auto']);
    expect(result.source).toEqual('website');
    expect(result.estimated_value).toEqual(5000.50);
    expect(typeof result.estimated_value).toEqual('number');
    expect(result.notes).toEqual('Test lead notes');
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.organisation_id).toEqual(1);
    expect(result.assigned_broker_id).toEqual(1);
    expect(result.parent_lead_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.status).toEqual('new'); // Default value
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save lead to database', async () => {
    const result = await createLead(testInput);

    // Query using proper drizzle syntax
    const leads = await db.select()
      .from(leadsTable)
      .where(eq(leadsTable.id, result.id))
      .execute();

    expect(leads).toHaveLength(1);
    expect(leads[0].name).toEqual('Test Lead');
    expect(leads[0].email).toEqual('lead@test.com');
    expect(leads[0].insurance_types).toEqual(['life', 'auto']);
    expect(parseFloat(leads[0].estimated_value)).toEqual(5000.50);
    expect(leads[0].status).toEqual('new');
    expect(leads[0].created_at).toBeInstanceOf(Date);
  });

  it('should create lead with parent relationship', async () => {
    // Create parent lead first
    const parentResult = await db.insert(leadsTable)
      .values(testParentLead)
      .returning()
      .execute();
    
    const parentId = parentResult[0].id;

    // Create child lead
    const childInput: CreateLeadInput = {
      ...testInput,
      name: 'Child Lead',
      parent_lead_id: parentId
    };

    const result = await createLead(childInput);

    expect(result.parent_lead_id).toEqual(parentId);
    expect(result.name).toEqual('Child Lead');
  });

  it('should create lead with nullable fields', async () => {
    const minimalInput: CreateLeadInput = {
      name: 'Minimal Lead',
      email: null,
      phone: null,
      insurance_types: ['business'],
      source: 'cold_call',
      estimated_value: 0,
      notes: null,
      due_date: null,
      organisation_id: 1,
      assigned_broker_id: null,
      parent_lead_id: null
    };

    const result = await createLead(minimalInput);

    expect(result.name).toEqual('Minimal Lead');
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.insurance_types).toEqual(['business']);
    expect(result.estimated_value).toEqual(0);
    expect(result.notes).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.assigned_broker_id).toBeNull();
    expect(result.parent_lead_id).toBeNull();
  });

  it('should handle multiple insurance types', async () => {
    const multiTypeInput: CreateLeadInput = {
      ...testInput,
      insurance_types: ['life', 'auto', 'health', 'home', 'business']
    };

    const result = await createLead(multiTypeInput);

    expect(result.insurance_types).toEqual(['life', 'auto', 'health', 'home', 'business']);
    expect(result.insurance_types).toHaveLength(5);
  });
});
