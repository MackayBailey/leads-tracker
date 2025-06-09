
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, leadsTable } from '../db/schema';
import { type GetReportsInput } from '../schema';
import { getLeadConversionReport } from '../handlers/get_lead_conversion_report';

// Test data setup
const testOrganisation = {
  name: 'Test Insurance Corp',
  description: 'Test organisation for reports',
};

const testUser = {
  email: 'broker@test.com',
  first_name: 'Test',
  last_name: 'Broker',
  role: 'broker' as const,
  organisation_id: 0, // Will be set after organisation creation
};

describe('getLeadConversionReport', () => {
  let organisationId: number;
  let userId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test organisation
    const orgResult = await db.insert(organisationsTable)
      .values(testOrganisation)
      .returning()
      .execute();
    organisationId = orgResult[0].id;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({ ...testUser, organisation_id: organisationId })
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should generate report with no leads', async () => {
    const input: GetReportsInput = {
      organisation_id: organisationId,
    };

    const result = await getLeadConversionReport(input);

    expect(result.organisation_id).toEqual(organisationId);
    expect(result.total_leads).toEqual(0);
    expect(result.converted_leads).toEqual(0);
    expect(result.conversion_rate).toEqual(0);
    expect(result.total_estimated_value).toEqual(0);
    expect(result.converted_value).toEqual(0);
    expect(result.by_source).toEqual([]);
    expect(result.by_insurance_type).toEqual([]);
  });

  it('should generate report with mixed lead statuses', async () => {
    // Create test leads with different statuses
    // Lead 1: ['life', 'health'] + 'new' → life+1 total, health+1 total, no conversions
    // Lead 2: ['auto'] + 'converted' → auto+1 total+converted  
    // Lead 3: ['life'] + 'converted' → life+1 total+converted
    // Lead 4: ['business', 'health'] + 'lost' → business+1 total, health+1 total, no conversions
    await db.insert(leadsTable).values([
      {
        name: 'Lead 1',
        insurance_types: JSON.stringify(['life', 'health']),
        status: 'new',
        source: 'referral',
        estimated_value: '1000.00',
        organisation_id: organisationId,
        assigned_broker_id: userId,
      },
      {
        name: 'Lead 2',
        insurance_types: JSON.stringify(['auto']),
        status: 'converted',
        source: 'website',
        estimated_value: '2000.50',
        organisation_id: organisationId,
        assigned_broker_id: userId,
      },
      {
        name: 'Lead 3',
        insurance_types: JSON.stringify(['life']),
        status: 'converted',
        source: 'referral',
        estimated_value: '1500.25',
        organisation_id: organisationId,
        assigned_broker_id: userId,
      },
      {
        name: 'Lead 4',
        insurance_types: JSON.stringify(['business', 'health']),
        status: 'lost',
        source: 'cold_call',
        estimated_value: '5000.00',
        organisation_id: organisationId,
        assigned_broker_id: userId,
      }
    ]).execute();

    const input: GetReportsInput = {
      organisation_id: organisationId,
    };

    const result = await getLeadConversionReport(input);

    // Overall metrics
    expect(result.organisation_id).toEqual(organisationId);
    expect(result.total_leads).toEqual(4);
    expect(result.converted_leads).toEqual(2);
    expect(result.conversion_rate).toEqual(0.5);
    expect(result.total_estimated_value).toEqual(9500.75);
    expect(result.converted_value).toEqual(3500.75); // 2000.50 + 1500.25

    // By source analysis
    expect(result.by_source).toHaveLength(3);
    
    const referralSource = result.by_source.find(s => s.source === 'referral');
    expect(referralSource).toBeDefined();
    expect(referralSource!.total).toEqual(2);
    expect(referralSource!.converted).toEqual(1);
    expect(referralSource!.conversion_rate).toEqual(0.5);

    const websiteSource = result.by_source.find(s => s.source === 'website');
    expect(websiteSource).toBeDefined();
    expect(websiteSource!.total).toEqual(1);
    expect(websiteSource!.converted).toEqual(1);
    expect(websiteSource!.conversion_rate).toEqual(1);

    const coldCallSource = result.by_source.find(s => s.source === 'cold_call');
    expect(coldCallSource).toBeDefined();
    expect(coldCallSource!.total).toEqual(1);
    expect(coldCallSource!.converted).toEqual(0);
    expect(coldCallSource!.conversion_rate).toEqual(0);

    // By insurance type analysis
    expect(result.by_insurance_type).toHaveLength(4);
    
    // Life: Lead 1 (new) + Lead 3 (converted) = total 2, converted 1
    const lifeType = result.by_insurance_type.find(t => t.insurance_type === 'life');
    expect(lifeType).toBeDefined();
    expect(lifeType!.total).toEqual(2);
    expect(lifeType!.converted).toEqual(1);
    expect(lifeType!.conversion_rate).toEqual(0.5);

    // Health: Lead 1 (new) + Lead 4 (lost) = total 2, converted 0
    const healthType = result.by_insurance_type.find(t => t.insurance_type === 'health');
    expect(healthType).toBeDefined();
    expect(healthType!.total).toEqual(2);
    expect(healthType!.converted).toEqual(0); // Fixed: neither Lead 1 nor Lead 4 is converted
    expect(healthType!.conversion_rate).toEqual(0);

    // Auto: Lead 2 (converted) = total 1, converted 1
    const autoType = result.by_insurance_type.find(t => t.insurance_type === 'auto');
    expect(autoType).toBeDefined();
    expect(autoType!.total).toEqual(1);
    expect(autoType!.converted).toEqual(1);
    expect(autoType!.conversion_rate).toEqual(1);

    // Business: Lead 4 (lost) = total 1, converted 0
    const businessType = result.by_insurance_type.find(t => t.insurance_type === 'business');
    expect(businessType).toBeDefined();
    expect(businessType!.total).toEqual(1);
    expect(businessType!.converted).toEqual(0);
    expect(businessType!.conversion_rate).toEqual(0);
  });

  it('should filter leads by date range', async () => {
    const currentDate = new Date();
    const futureDate = new Date(currentDate);
    futureDate.setDate(futureDate.getDate() + 1);
    
    const pastDate = new Date('2023-01-01');

    // Create leads with specific created_at dates
    await db.insert(leadsTable).values([
      {
        name: 'Old Lead',
        insurance_types: JSON.stringify(['life']),
        status: 'converted',
        source: 'referral',
        estimated_value: '1000.00',
        organisation_id: organisationId,
        assigned_broker_id: userId,
        created_at: pastDate,
      },
      {
        name: 'Recent Lead',
        insurance_types: JSON.stringify(['auto']),
        status: 'new',
        source: 'website',
        estimated_value: '2000.00',
        organisation_id: organisationId,
        assigned_broker_id: userId,
        created_at: currentDate,
      }
    ]).execute();

    // Filter to include only today's leads
    const input: GetReportsInput = {
      organisation_id: organisationId,
      start_date: currentDate,
      end_date: futureDate,
    };

    const result = await getLeadConversionReport(input);

    // Should only include the recent lead
    expect(result.total_leads).toEqual(1);
    expect(result.converted_leads).toEqual(0);
    expect(result.total_estimated_value).toEqual(2000);
    expect(result.by_source).toHaveLength(1);
    expect(result.by_source[0].source).toEqual('website');
  });

  it('should only include leads from specified organisation', async () => {
    // Create another organisation
    const otherOrgResult = await db.insert(organisationsTable)
      .values({ name: 'Other Corp', description: 'Other organisation' })
      .returning()
      .execute();
    const otherOrgId = otherOrgResult[0].id;

    // Create leads in both organisations
    await db.insert(leadsTable).values([
      {
        name: 'Target Org Lead',
        insurance_types: JSON.stringify(['life']),
        status: 'converted',
        source: 'referral',
        estimated_value: '1000.00',
        organisation_id: organisationId,
        assigned_broker_id: userId,
      },
      {
        name: 'Other Org Lead',
        insurance_types: JSON.stringify(['auto']),
        status: 'converted',
        source: 'website',
        estimated_value: '2000.00',
        organisation_id: otherOrgId,
        assigned_broker_id: userId,
      }
    ]).execute();

    const input: GetReportsInput = {
      organisation_id: organisationId,
    };

    const result = await getLeadConversionReport(input);

    // Should only include leads from target organisation
    expect(result.total_leads).toEqual(1);
    expect(result.converted_leads).toEqual(1);
    expect(result.total_estimated_value).toEqual(1000);
    expect(result.by_source).toHaveLength(1);
    expect(result.by_source[0].source).toEqual('referral');
  });
});
