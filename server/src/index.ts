
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Schema imports
import { 
  createOrganisationInputSchema,
  updateOrganisationInputSchema,
  createUserInputSchema,
  getUsersByOrganisationInputSchema,
  updateUserInputSchema,
  createLeadInputSchema,
  getLeadsByOrganisationInputSchema,
  updateLeadInputSchema,
  createDocumentInputSchema,
  createNotificationInputSchema,
  getNotificationsByUserInputSchema,
  getReportsInputSchema
} from './schema';

// Handler imports
import { createOrganisation } from './handlers/create_organisation';
import { getOrganisations } from './handlers/get_organisations';
import { updateOrganisation } from './handlers/update_organisation';
import { createUser } from './handlers/create_user';
import { getUsersByOrganisation } from './handlers/get_users_by_organisation';
import { updateUser } from './handlers/update_user';
import { createLead } from './handlers/create_lead';
import { getLeadsByOrganisation } from './handlers/get_leads_by_organisation';
import { getLeadById } from './handlers/get_lead_by_id';
import { updateLead } from './handlers/update_lead';
import { deleteLead } from './handlers/delete_lead';
import { createDocument } from './handlers/create_document';
import { getDocumentsByLead } from './handlers/get_documents_by_lead';
import { deleteDocument } from './handlers/delete_document';
import { createNotification } from './handlers/create_notification';
import { getNotificationsByUser } from './handlers/get_notifications_by_user';
import { markNotificationRead } from './handlers/mark_notification_read';
import { getDueLeads } from './handlers/get_due_leads';
import { getLeadConversionReport } from './handlers/get_lead_conversion_report';
import { getBrokerPerformanceReports } from './handlers/get_broker_performance_reports';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Organisation endpoints
  createOrganisation: publicProcedure
    .input(createOrganisationInputSchema)
    .mutation(({ input }) => createOrganisation(input)),

  getOrganisations: publicProcedure
    .query(() => getOrganisations()),

  updateOrganisation: publicProcedure
    .input(updateOrganisationInputSchema)
    .mutation(({ input }) => updateOrganisation(input)),

  // User endpoints
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsersByOrganisation: publicProcedure
    .input(getUsersByOrganisationInputSchema)
    .query(({ input }) => getUsersByOrganisation(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Lead endpoints
  createLead: publicProcedure
    .input(createLeadInputSchema)
    .mutation(({ input }) => createLead(input)),

  getLeadsByOrganisation: publicProcedure
    .input(getLeadsByOrganisationInputSchema)
    .query(({ input }) => getLeadsByOrganisation(input)),

  getLeadById: publicProcedure
    .input(z.number())
    .query(({ input }) => getLeadById(input)),

  updateLead: publicProcedure
    .input(updateLeadInputSchema)
    .mutation(({ input }) => updateLead(input)),

  deleteLead: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteLead(input)),

  // Document endpoints
  createDocument: publicProcedure
    .input(createDocumentInputSchema)
    .mutation(({ input }) => createDocument(input)),

  getDocumentsByLead: publicProcedure
    .input(z.number())
    .query(({ input }) => getDocumentsByLead(input)),

  deleteDocument: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteDocument(input)),

  // Notification endpoints
  createNotification: publicProcedure
    .input(createNotificationInputSchema)
    .mutation(({ input }) => createNotification(input)),

  getNotificationsByUser: publicProcedure
    .input(getNotificationsByUserInputSchema)
    .query(({ input }) => getNotificationsByUser(input)),

  markNotificationRead: publicProcedure
    .input(z.number())
    .mutation(({ input }) => markNotificationRead(input)),

  // Lead management utilities
  getDueLeads: publicProcedure
    .input(z.number())
    .query(({ input }) => getDueLeads(input)),

  // Reporting endpoints
  getLeadConversionReport: publicProcedure
    .input(getReportsInputSchema)
    .query(({ input }) => getLeadConversionReport(input)),

  getBrokerPerformanceReports: publicProcedure
    .input(getReportsInputSchema)
    .query(({ input }) => getBrokerPerformanceReports(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
