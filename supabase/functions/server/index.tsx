import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

// Import API handlers
import {
  handleLogin,
  handleSignup,
  handleLogout,
  handleGetCurrentUser,
  handleCheckDuplicate,
  handleCreateLandlord,
  handleGetAllUsers,
  handleChangePassword,
  initializeAdminAccount,
} from "./auth.ts";

import {
  handleGetBuildings,
  handleGetBuilding,
  handleCreateBuilding,
  handleUpdateBuilding,
  handleDeleteBuilding,
  handleAssignTenantToUnit,
  handleUnassignTenantFromUnit,
  handleGetUnassignedTenants,
  handleGetLandlordTenants,
  handleGetTenantAssignment,
  handleUpdateTenantProfile,
  handleUpdateTenantDueDate,
} from "./buildings.ts";

import {
  handleGetBills,
  handleUpdateBill,
} from "./bills.ts";

import {
  handleGetLandlordConversations,
  handleGetLandlordThread,
  handleSendLandlordMessage,
  handleGetTenantThread,
  handleSendTenantMessage,
} from "./messages.ts";

import {
  handleGetAuditLogs,
} from "./audit.ts";

import {
  handleGetTenantPayments,
  handlePayRent,
  handlePayBill,
  handlePaySecurityDeposit,
  handlePurchaseElectricityToken,
  handleCreatePaymentPlanRequest,
  handleGetPaymentPlanRequests,
} from "./payments.ts";

import {
  handleGetAdminOverview,
  handleGetAdminProperties,
  handleGetAdminRevenue,
  handleGetAdminSupportTickets,
  handleUpdateAdminSupportTicket,
} from "./admin.ts";

const app = new Hono();
const legacyPrefix = "/make-server-28aab74c";
const serverPrefix = "/server";

function withPrefixes(path: string): string[] {
  return [path, `${legacyPrefix}${path}`, `${serverPrefix}${path}`];
}

function registerGet(path: string, handler: Parameters<typeof app.get>[1]) {
  for (const p of withPrefixes(path)) app.get(p, handler);
}

function registerPost(path: string, handler: Parameters<typeof app.post>[1]) {
  for (const p of withPrefixes(path)) app.post(p, handler);
}

function registerPut(path: string, handler: Parameters<typeof app.put>[1]) {
  for (const p of withPrefixes(path)) app.put(p, handler);
}

function registerDelete(path: string, handler: Parameters<typeof app.delete>[1]) {
  for (const p of withPrefixes(path)) app.delete(p, handler);
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-user-token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ============================================================================
// Health Check
// ============================================================================

registerGet("/health", (c) => {
  return c.json({ status: "ok", service: "Rentify API" });
});

// ============================================================================
// Authentication Routes
// ============================================================================

registerPost("/auth/login", async (c) => {
  const response = await handleLogin(c.req.raw);
  return response;
});

registerPost("/auth/signup", async (c) => {
  const response = await handleSignup(c.req.raw);
  return response;
});

registerPost("/auth/logout", async (c) => {
  const response = await handleLogout(c.req.raw);
  return response;
});

registerGet("/auth/me", async (c) => {
  const response = await handleGetCurrentUser(c.req.raw);
  return response;
});

registerPost("/auth/check-duplicate", async (c) => {
  const response = await handleCheckDuplicate(c.req.raw);
  return response;
});

registerPost("/auth/create-landlord", async (c) => {
  const response = await handleCreateLandlord(c.req.raw);
  return response;
});

registerPost("/auth/change-password", async (c) => {
  const response = await handleChangePassword(c.req.raw);
  return response;
});

registerGet("/auth/users", async (c) => {
  const response = await handleGetAllUsers(c.req.raw);
  return response;
});

// Initialize Admin Account
registerPost("/auth/init-admin", async (c) => {
  const response = await initializeAdminAccount(c.req.raw);
  return response;
});

// ============================================================================
// Buildings Routes
// ============================================================================

registerGet("/buildings", async (c) => {
  const response = await handleGetBuildings(c.req.raw);
  return response;
});

registerGet("/buildings/:id", async (c) => {
  const id = c.req.param("id");
  const response = await handleGetBuilding(c.req.raw, id);
  return response;
});

registerPost("/buildings", async (c) => {
  const response = await handleCreateBuilding(c.req.raw);
  return response;
});

registerPut("/buildings/:id", async (c) => {
  const id = c.req.param("id");
  const response = await handleUpdateBuilding(c.req.raw, id);
  return response;
});

registerDelete("/buildings/:id", async (c) => {
  const id = c.req.param("id");
  const response = await handleDeleteBuilding(c.req.raw, id);
  return response;
});

registerPost("/units/:id/assign-tenant", async (c) => {
  const id = c.req.param("id");
  const response = await handleAssignTenantToUnit(c.req.raw, id);
  return response;
});

registerPost("/units/:id/unassign-tenant", async (c) => {
  const id = c.req.param("id");
  const response = await handleUnassignTenantFromUnit(c.req.raw, id);
  return response;
});

registerGet("/tenants/unassigned", async (c) => {
  const response = await handleGetUnassignedTenants(c.req.raw);
  return response;
});

registerGet("/tenants/landlord", async (c) => {
  const response = await handleGetLandlordTenants(c.req.raw);
  return response;
});

registerGet("/tenants/me/assignment", async (c) => {
  const response = await handleGetTenantAssignment(c.req.raw);
  return response;
});

registerPut('/tenants/me/profile', async (c) => {
  const response = await handleUpdateTenantProfile(c.req.raw);
  return response;
});

registerPut('/tenants/:tenantId/due-date', async (c) => {
  const tenantId = c.req.param('tenantId');
  const response = await handleUpdateTenantDueDate(c.req.raw, tenantId);
  return response;
});

// ============================================================================
// Bills Routes
// ============================================================================

registerGet("/bills", async (c) => {
  const response = await handleGetBills(c.req.raw);
  return response;
});

registerPut("/bills/:id", async (c) => {
  const id = c.req.param("id");
  const response = await handleUpdateBill(c.req.raw, id);
  return response;
});

registerGet('/payments/me', async (c) => {
  const response = await handleGetTenantPayments(c.req.raw);
  return response;
});

registerPost('/payments/rent', async (c) => {
  const response = await handlePayRent(c.req.raw);
  return response;
});

registerPost('/payments/bills/:id/pay', async (c) => {
  const id = c.req.param('id');
  const response = await handlePayBill(c.req.raw, id);
  return response;
});

registerPost('/payments/security-deposit', async (c) => {
  const response = await handlePaySecurityDeposit(c.req.raw);
  return response;
});

registerPost('/payments/electricity', async (c) => {
  const response = await handlePurchaseElectricityToken(c.req.raw);
  return response;
});

registerGet('/payment-plans', async (c) => {
  const response = await handleGetPaymentPlanRequests(c.req.raw);
  return response;
});

registerPost('/payment-plans', async (c) => {
  const response = await handleCreatePaymentPlanRequest(c.req.raw);
  return response;
});

// ============================================================================
// Messages Routes
// ============================================================================

registerGet("/messages/landlord/conversations", async (c) => {
  const response = await handleGetLandlordConversations(c.req.raw);
  return response;
});

registerGet("/messages/landlord/:tenantId", async (c) => {
  const tenantId = c.req.param("tenantId");
  const response = await handleGetLandlordThread(c.req.raw, tenantId);
  return response;
});

registerPost("/messages/landlord/:tenantId", async (c) => {
  const tenantId = c.req.param("tenantId");
  const response = await handleSendLandlordMessage(c.req.raw, tenantId);
  return response;
});

registerGet("/messages/tenant/thread", async (c) => {
  const response = await handleGetTenantThread(c.req.raw);
  return response;
});

registerPost("/messages/tenant/thread", async (c) => {
  const response = await handleSendTenantMessage(c.req.raw);
  return response;
});

// ============================================================================
// Audit Logs Routes
// ============================================================================

registerGet("/audit/logs", async (c) => {
  const response = await handleGetAuditLogs(c.req.raw);
  return response;
});

// ============================================================================
// Admin Dashboard Routes
// ============================================================================

registerGet('/admin/overview', async (c) => {
  const response = await handleGetAdminOverview(c.req.raw);
  return response;
});

registerGet('/admin/properties', async (c) => {
  const response = await handleGetAdminProperties(c.req.raw);
  return response;
});

registerGet('/admin/revenue', async (c) => {
  const response = await handleGetAdminRevenue(c.req.raw);
  return response;
});

registerGet('/admin/support/tickets', async (c) => {
  const response = await handleGetAdminSupportTickets(c.req.raw);
  return response;
});

registerPut('/admin/support/tickets/:id', async (c) => {
  const id = c.req.param('id');
  const response = await handleUpdateAdminSupportTicket(c.req.raw, id);
  return response;
});

// ============================================================================
// Key-Value Store (existing functionality)
// ============================================================================

// Example KV route - you can expand this
registerGet("/kv/:key", async (c) => {
  const key = c.req.param("key");
  const value = await kv.get(key);
  return c.json({ key, value });
});

registerPost("/kv/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  await kv.set(key, body.value);
  return c.json({ success: true, key, value: body.value });
});

app.all('*', (c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    path: c.req.path,
    method: c.req.method,
  }, 404);
});

// ============================================================================
// Start Server
// ============================================================================

Deno.serve(app.fetch);