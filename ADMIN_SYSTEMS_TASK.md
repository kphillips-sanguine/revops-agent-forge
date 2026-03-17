# Admin & Systems Context Feature

## Overview
Add an admin-only feature set that lets admins define connected systems, business context,
guardrails, and data models — all of which feed into the Builder AI so it generates
agents with deep understanding of Sanguine's ecosystem.

## Connected Systems (8)
1. Salesforce (CRM, Cases, Opportunities, custom objects)
2. HubSpot (Marketing automation, contacts, campaigns)
3. SharePoint (Document management, team sites)
4. NetSuite (ERP, financials, inventory, orders)
5. Google Drive (File storage, collaboration)
6. Google Sheets (Spreadsheets, data tracking)
7. WooCommerce (E-commerce, orders, products)
8. LabGuru (LIMS - lab information management, samples, experiments)

## Database Schema

### connected_systems
- id: UUID PK
- name: str (e.g., "Salesforce")
- slug: str unique (e.g., "salesforce")
- description: text
- icon: str (icon identifier)
- category: str (crm|erp|marketing|storage|ecommerce|lims)
- status: enum (active|inactive|coming_soon)
- base_url: str nullable (instance URL)
- auth_type: str (oauth|api_key|token)
- credential_ref: str nullable (env var name for creds)
- capabilities: JSON (read: bool, write: bool, query: bool, webhook: bool)
- created_at, updated_at: timestamp

### system_documents
- id: UUID PK
- system_id: FK → connected_systems
- doc_type: enum (architecture|data_model|integration_guide|api_reference)
- title: str
- content_md: text (Markdown)
- version: int
- updated_by: str
- created_at, updated_at: timestamp

### guardrail_rules
- id: UUID PK
- scope: enum (global|system)
- system_id: FK nullable → connected_systems
- category: str (data_access|pii|rate_limit|cost|compliance|safety)
- name: str
- description: text
- rule_type: enum (block|warn|log)
- rule_definition: JSON (conditions, thresholds, patterns)
- enabled: bool
- priority: int
- created_by: str
- created_at, updated_at: timestamp

### business_context
- id: UUID PK
- context_key: str unique (company_overview|org_structure|processes|terminology|data_flow|compliance)
- title: str
- content_md: text
- version: int
- updated_by: str
- created_at, updated_at: timestamp

## Backend Endpoints

### Systems Router (/api/admin/systems)
- GET / — list all systems (any authenticated user can read)
- GET /{id} — get system detail with docs + guardrails
- POST / — create system (admin/revops only)
- PUT /{id} — update system (admin/revops only)
- DELETE /{id} — soft-delete system (admin only)

### System Documents (/api/admin/systems/{id}/documents)
- GET / — list docs for a system
- POST / — create doc
- PUT /{doc_id} — update doc
- DELETE /{doc_id} — delete doc

### Guardrails Router (/api/admin/guardrails)
- GET / — list all guardrails (filter by scope, system_id, category)
- POST / — create guardrail (admin/revops)
- PUT /{id} — update guardrail
- DELETE /{id} — delete guardrail
- POST /validate — test a guardrail against sample input

### Business Context (/api/admin/context)
- GET / — list all context entries
- GET /{key} — get specific context
- PUT /{key} — upsert context (admin/revops)

### Builder Context (/api/builder/context)
- GET / — returns assembled context for the builder prompt
  (systems + data models + guardrails + business context, compiled into a single prompt section)

## Frontend Pages

### Admin Layout (/admin) — admin/revops role required
1. **Systems Management** (/admin/systems)
   - Card grid of all 8 systems with status, icon, capability badges
   - Click → system detail page

2. **System Detail** (/admin/systems/:slug)
   - Tabs: Overview | Architecture | Data Model | Integration | Guardrails
   - Each tab has Monaco editor for MD content
   - Guardrails tab: table of rules with enable/disable toggles

3. **Guardrails** (/admin/guardrails)
   - Global guardrails management
   - Filter by category, scope, severity
   - Create/edit modal with rule builder

4. **Business Context** (/admin/context)
   - Sections: Company Overview, Org Structure, Business Processes, Terminology, Data Flows, Compliance
   - Each section editable via Monaco editor

5. **User Management** (/admin/users) — admin only
   - List users, assign roles, enable/disable

## Builder Enhancement
The builder prompt must include assembled context:
- Company overview
- Available systems and their capabilities
- Data models for relevant systems (based on tools the agent uses)
- Applicable guardrails
- Business terminology/processes
- The builder should suggest appropriate systems/tools based on the user's description

## Seed Data
Pre-populate all 8 systems with realistic descriptions, starter architecture docs,
and basic data model outlines for each system.
