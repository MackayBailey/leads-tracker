
import { db } from '../db';
import { usersTable, leadsTable } from '../db/schema';
import { type GetReportsInput, type BrokerPerformanceReport } from '../schema';
import { eq, and, gte, lte, SQL, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const getBrokerPerformanceReports = async (input: GetReportsInput): Promise<BrokerPerformanceReport[]> => {
  try {
    // Build base query with join
    let query = db.select({
      broker_id: usersTable.id,
      broker_name: sql<string>`${usersTable.first_name} || ' ' || ${usersTable.last_name}`.as('broker_name'),
      total_leads: sql<number>`count(${leadsTable.id})::int`.as('total_leads'),
      converted_leads: sql<number>`count(case when ${leadsTable.status} = 'converted' then 1 end)::int`.as('converted_leads'),
      total_estimated_value: sql<string>`coalesce(sum(${leadsTable.estimated_value}), 0)`.as('total_estimated_value'),
      converted_value: sql<string>`coalesce(sum(case when ${leadsTable.status} = 'converted' then ${leadsTable.estimated_value} else 0 end), 0)`.as('converted_value')
    })
    .from(usersTable)
    .leftJoin(leadsTable, eq(usersTable.id, leadsTable.assigned_broker_id));

    // Build conditions
    const conditions: SQL<unknown>[] = [
      eq(usersTable.organisation_id, input.organisation_id),
      eq(usersTable.role, 'broker'),
      eq(usersTable.is_active, true)
    ];

    // Add date filters if provided
    if (input.start_date) {
      conditions.push(gte(leadsTable.created_at, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(leadsTable.created_at, input.end_date));
    }

    // Apply conditions, groupBy and orderBy in one chain to maintain type safety
    const results = await query
      .where(and(...conditions))
      .groupBy(usersTable.id, usersTable.first_name, usersTable.last_name)
      .orderBy(desc(sql`count(${leadsTable.id})`))
      .execute();

    // Transform results and calculate conversion rates
    return results.map(result => {
      const totalEstimatedValue = parseFloat(result.total_estimated_value);
      const convertedValue = parseFloat(result.converted_value);
      const conversionRate = result.total_leads > 0 
        ? (result.converted_leads / result.total_leads) * 100 
        : 0;

      return {
        broker_id: result.broker_id,
        broker_name: result.broker_name,
        total_leads: result.total_leads,
        converted_leads: result.converted_leads,
        conversion_rate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
        total_estimated_value: totalEstimatedValue,
        converted_value: convertedValue,
      };
    });
  } catch (error) {
    console.error('Broker performance reports generation failed:', error);
    throw error;
  }
};
