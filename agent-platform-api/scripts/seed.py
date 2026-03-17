"""Seed script — creates default admin user, tool registry entries, and API key."""

import asyncio
import uuid
from datetime import datetime, timezone

import bcrypt as _bcrypt

class _BcryptHelper:
    @staticmethod
    def hash(password: str) -> str:
        return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory, engine
from app.models.api_key import ApiKey
from app.models.system import BusinessContext, ConnectedSystem, GuardrailRule, SystemDocument
from app.models.tool import ToolRegistryEntry
from app.models.user import User

ADMIN_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_API_KEY = "agentforge-n8n-dev-key-2026"


SEED_TOOLS = [
    {
        "name": "salesforce_query",
        "display_name": "Salesforce Query (Read-Only)",
        "description": (
            "Execute SOQL queries against Salesforce to read data. "
            "Supports all standard and custom objects. Read-only — "
            "cannot create, update, or delete records."
        ),
        "tier": "read_only",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "sf_cli",
            "command": 'sf data query --query "{soql}" --target-org {org} --json',
            "default_org": "prod",
            "allowed_orgs": ["prod"],
            "timeout_seconds": 30,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "soql": {"type": "string", "description": "SOQL query to execute"},
                "org": {"type": "string", "enum": ["prod"], "default": "prod"},
            },
            "required": ["soql"],
        },
        "rate_limit_per_execution": 20,
        "rate_limit_per_day": 5000,
        "requires_approval": False,
        "documentation_md": "## Salesforce Query\n\nUse SOQL to read data from Salesforce.\n\n### Example\n```\nSELECT Id, Name FROM Account WHERE CreatedDate = TODAY\n```",
    },
    {
        "name": "sf_record_update",
        "display_name": "Salesforce Record Update",
        "description": (
            "Update existing Salesforce records. Requires specifying "
            "object type, record ID, and fields to update."
        ),
        "tier": "write",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "sf_cli",
            "command": (
                'sf data update record --sobject {object} --record-id {record_id} '
                '--values "{fields}" --target-org {org} --json'
            ),
            "default_org": "prod",
            "allowed_orgs": ["prod"],
            "timeout_seconds": 15,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "object": {"type": "string", "description": "SObject API name"},
                "record_id": {"type": "string", "description": "18-char record ID"},
                "fields": {"type": "object", "description": "Field:Value pairs to update"},
            },
            "required": ["object", "record_id", "fields"],
        },
        "rate_limit_per_execution": 10,
        "rate_limit_per_day": 500,
        "requires_approval": False,
        "documentation_md": "## Salesforce Record Update\n\nUpdate fields on an existing record.",
    },
    {
        "name": "slack_notify",
        "display_name": "Slack Notification",
        "description": (
            "Send messages to Slack channels. Supports formatting, "
            "mentions, and attachments."
        ),
        "tier": "notify",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "slack_api",
            "method": "chat.postMessage",
            "allowed_channels": ["#finance", "#critical-cases", "#general", "#revops"],
            "timeout_seconds": 10,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "channel": {"type": "string", "description": "Slack channel name"},
                "message": {"type": "string", "description": "Message text (supports Slack markdown)"},
                "thread_ts": {"type": "string", "description": "Thread timestamp for replies"},
            },
            "required": ["channel", "message"],
        },
        "rate_limit_per_execution": 5,
        "rate_limit_per_day": 200,
        "requires_approval": False,
        "documentation_md": "## Slack Notification\n\nSend messages to Slack channels.",
    },
    {
        "name": "email_send",
        "display_name": "Email Send",
        "description": "Send email messages. Supports HTML formatting and attachments.",
        "tier": "notify",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "email_api",
            "method": "send",
            "timeout_seconds": 15,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Recipient email address"},
                "subject": {"type": "string", "description": "Email subject"},
                "body": {"type": "string", "description": "Email body (HTML)"},
            },
            "required": ["to", "subject", "body"],
        },
        "rate_limit_per_execution": 5,
        "rate_limit_per_day": 100,
        "requires_approval": False,
        "documentation_md": "## Email Send\n\nSend emails via the platform email service.",
    },
    {
        "name": "google_sheets_read",
        "display_name": "Google Sheets Read",
        "description": "Read data from Google Sheets spreadsheets. Returns cell data as JSON.",
        "tier": "read_only",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "google_sheets_api",
            "method": "spreadsheets.values.get",
            "timeout_seconds": 15,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {"type": "string", "description": "Google Sheets spreadsheet ID"},
                "range": {"type": "string", "description": "Cell range (e.g. Sheet1!A1:D10)"},
            },
            "required": ["spreadsheet_id", "range"],
        },
        "rate_limit_per_execution": 10,
        "rate_limit_per_day": 1000,
        "requires_approval": False,
        "documentation_md": "## Google Sheets Read\n\nRead data from a Google Sheets spreadsheet.",
    },
]


async def seed() -> None:
    async with async_session_factory() as session:
        session: AsyncSession

        # 1. Create admin user
        existing = await session.execute(
            select(User).where(User.id == ADMIN_USER_ID)
        )
        if existing.scalar_one_or_none() is None:
            import os
            default_pw = os.environ.get("ADMIN_PASSWORD", "AgentForge2026!")
            admin = User(
                id=ADMIN_USER_ID,
                email="kevin@sanguinebio.com",
                display_name="Kevin Phillips",
                role="revops",
                is_active=True,
                password_hash=_BcryptHelper.hash(default_pw),
            )
            session.add(admin)
            await session.flush()
            print(f"Created admin user: kevin@sanguinebio.com (revops) — password: {default_pw}")
        else:
            print("Admin user already exists, skipping.")

        # 2. Create tool registry entries
        for tool_data in SEED_TOOLS:
            existing_tool = await session.execute(
                select(ToolRegistryEntry).where(ToolRegistryEntry.name == tool_data["name"])
            )
            if existing_tool.scalar_one_or_none() is None:
                tool = ToolRegistryEntry(
                    managed_by=ADMIN_USER_ID,
                    **tool_data,
                )
                session.add(tool)
                print(f"Created tool: {tool_data['name']}")
            else:
                print(f"Tool '{tool_data['name']}' already exists, skipping.")

        # 3. Create default API key for n8n
        key_hash = _BcryptHelper.hash(DEFAULT_API_KEY)
        existing_key = await session.execute(
            select(ApiKey).where(ApiKey.name == "n8n-default")
        )
        if existing_key.scalar_one_or_none() is None:
            api_key = ApiKey(
                name="n8n-default",
                key_hash=key_hash,
                role="service",
                is_active=True,
                created_by=ADMIN_USER_ID,
            )
            session.add(api_key)
            print(f"Created API key 'n8n-default'. Key value: {DEFAULT_API_KEY}")
        else:
            print("API key 'n8n-default' already exists, skipping.")

        # 4. Seed connected systems
        SEED_SYSTEMS = [
            {
                "name": "Salesforce",
                "slug": "salesforce",
                "description": "Primary CRM platform. Manages accounts, contacts, opportunities, cases, custom objects. Core to all revenue operations.",
                "icon": "cloud",
                "category": "crm",
                "status": "active",
                "auth_type": "oauth",
                "credential_ref": "SF_PROD_AUTH_URL",
                "capabilities": {"read": True, "write": True, "query": True, "webhook": True},
            },
            {
                "name": "HubSpot",
                "slug": "hubspot",
                "description": "Marketing automation and inbound marketing. Manages contacts, campaigns, email sequences, forms, and marketing analytics.",
                "icon": "megaphone",
                "category": "marketing",
                "status": "active",
                "auth_type": "api_key",
                "credential_ref": "HUBSPOT_API_KEY",
                "capabilities": {"read": True, "write": True, "query": True, "webhook": True},
            },
            {
                "name": "SharePoint",
                "slug": "sharepoint",
                "description": "Document management and team collaboration. Hosts SOPs, policies, project files, and internal wikis across departments.",
                "icon": "file-text",
                "category": "storage",
                "status": "active",
                "auth_type": "oauth",
                "credential_ref": "SHAREPOINT_CLIENT_SECRET",
                "capabilities": {"read": True, "write": True, "query": True, "webhook": False},
            },
            {
                "name": "NetSuite",
                "slug": "netsuite",
                "description": "ERP system for financials, inventory, orders, and procurement. Source of truth for all financial data and supply chain.",
                "icon": "dollar-sign",
                "category": "erp",
                "status": "active",
                "auth_type": "token",
                "credential_ref": "NETSUITE_TOKEN_SECRET",
                "capabilities": {"read": True, "write": True, "query": True, "webhook": False},
            },
            {
                "name": "Google Drive",
                "slug": "google-drive",
                "description": "Cloud file storage for shared documents, spreadsheets, and presentations. Used across all departments for collaboration.",
                "icon": "hard-drive",
                "category": "storage",
                "status": "active",
                "auth_type": "oauth",
                "credential_ref": "GOOGLE_SERVICE_ACCOUNT_KEY",
                "capabilities": {"read": True, "write": True, "query": True, "webhook": False},
            },
            {
                "name": "Google Sheets",
                "slug": "google-sheets",
                "description": "Spreadsheet data store used for tracking, reporting, and ad-hoc data management. Many teams maintain operational data here.",
                "icon": "table",
                "category": "storage",
                "status": "active",
                "auth_type": "oauth",
                "credential_ref": "GOOGLE_SERVICE_ACCOUNT_KEY",
                "capabilities": {"read": True, "write": True, "query": False, "webhook": False},
            },
            {
                "name": "WooCommerce",
                "slug": "woocommerce",
                "description": "E-commerce platform for online product sales. Manages products, orders, customers, and payment processing.",
                "icon": "shopping-cart",
                "category": "ecommerce",
                "status": "active",
                "auth_type": "api_key",
                "credential_ref": "WOOCOMMERCE_API_SECRET",
                "capabilities": {"read": True, "write": True, "query": True, "webhook": True},
            },
            {
                "name": "LabGuru",
                "slug": "labguru",
                "description": "Laboratory Information Management System (LIMS). Manages samples, experiments, protocols, inventory, and lab workflows. Critical for R&D and quality control.",
                "icon": "flask-conical",
                "category": "lims",
                "status": "active",
                "auth_type": "api_key",
                "credential_ref": "LABGURU_API_KEY",
                "capabilities": {"read": True, "write": True, "query": True, "webhook": False},
            },
        ]

        for sys_data in SEED_SYSTEMS:
            existing = await session.execute(
                select(ConnectedSystem).where(ConnectedSystem.slug == sys_data["slug"])
            )
            if existing.scalar_one_or_none() is None:
                system = ConnectedSystem(**sys_data)
                session.add(system)
                await session.flush()
                print(f"Created system: {sys_data['name']}")

                # Add starter architecture doc for each system
                arch_docs = _get_architecture_doc(sys_data["slug"])
                if arch_docs:
                    doc = SystemDocument(
                        system_id=system.id,
                        doc_type="architecture",
                        title=f"{sys_data['name']} Architecture",
                        content_md=arch_docs,
                        updated_by="kevin@sanguinebio.com",
                    )
                    session.add(doc)

                # Add starter data model doc
                dm_docs = _get_data_model_doc(sys_data["slug"])
                if dm_docs:
                    doc = SystemDocument(
                        system_id=system.id,
                        doc_type="data_model",
                        title=f"{sys_data['name']} Data Model",
                        content_md=dm_docs,
                        updated_by="kevin@sanguinebio.com",
                    )
                    session.add(doc)
            else:
                print(f"System '{sys_data['name']}' already exists, skipping.")

        # 5. Seed business context
        SEED_CONTEXT = {
            "company_overview": {
                "title": "Company Overview",
                "content_md": """# Sanguine Biosciences

**Industry:** Biotechnology / Life Sciences
**Headquarters:** Based in the US
**Mission:** Advancing precision medicine through innovative biological sample collection and processing.

## What We Do
Sanguine Biosciences is a biotech company specializing in the collection and processing of human biological samples for research. We connect patients/donors with pharmaceutical and biotech researchers who need fresh, high-quality biospecimens for drug discovery, clinical trials, and diagnostics development.

## Key Business Lines
1. **Sample Collection Services** — Coordinating donor recruitment, scheduling, and sample collection at patient homes or clinical sites
2. **Bioprocessing** — Processing collected samples (blood, tissue, etc.) into research-ready formats (PBMCs, serum, plasma, etc.)
3. **Research Services** — Running assays and experiments on behalf of clients using collected samples
4. **Clinical Trial Support** — Providing biospecimen logistics for clinical trials

## Revenue Model
- Project-based contracts with pharma/biotech companies
- Per-sample pricing for collection and processing
- Service fees for custom assays and experiments

## Key Metrics
- Number of active projects
- Samples collected per month
- Revenue per project
- Donor recruitment efficiency
- Sample quality scores
- Client satisfaction / NPS
""",
            },
            "org_structure": {
                "title": "Organization Structure",
                "content_md": """# Sanguine Org Structure

## Departments
- **Commercial / Sales** — Client relationships, proposals, contracts (uses Salesforce + HubSpot)
- **Operations** — Sample collection logistics, scheduling, donor coordination (uses Salesforce + LabGuru)
- **Lab / R&D** — Sample processing, assays, experiments (uses LabGuru)
- **Finance** — Invoicing, revenue recognition, procurement (uses NetSuite)
- **IT / RevOps** — Systems, integrations, automation, data (manages all platforms)
- **Marketing** — Campaigns, lead generation, website (uses HubSpot + WooCommerce)
- **Quality** — Compliance, SOPs, audit trails (uses SharePoint + LabGuru)

## Key Roles
- CEO, CFO, CTO, VP of Operations, VP of Sales
- Sales Reps, Project Managers, Lab Technicians, Donor Coordinators
- IT/RevOps team manages all system integrations
""",
            },
            "processes": {
                "title": "Business Processes",
                "content_md": """# Key Business Processes

## Lead-to-Cash
1. **Lead Generation** (HubSpot) → Marketing campaigns, website inquiries
2. **Qualification** (HubSpot → Salesforce) → Sales team qualifies leads
3. **Proposal/Quote** (Salesforce) → Custom project scoping and pricing
4. **Contract** (Salesforce) → SOW/MSA execution
5. **Project Setup** (Salesforce + LabGuru) → Sample requirements, protocols, timelines
6. **Donor Recruitment** (Salesforce) → Match donors to project criteria
7. **Sample Collection** (Salesforce + LabGuru) → Schedule and collect samples
8. **Processing** (LabGuru) → Process samples per protocol
9. **Delivery** (LabGuru + Salesforce) → Ship processed samples to client
10. **Invoicing** (NetSuite) → Bill client based on deliverables
11. **Revenue Recognition** (NetSuite) → Recognize revenue per ASC 606

## Support Process
1. **Case Creation** (Salesforce) → Client or internal request
2. **Triage** (Salesforce) → Priority assignment, routing
3. **Resolution** (Salesforce + relevant system) → Investigate and resolve
4. **Closure** (Salesforce) → Document resolution, collect feedback

## Inventory Management
1. **Procurement** (NetSuite) → Order lab supplies and equipment
2. **Receiving** (NetSuite + LabGuru) → Log received items
3. **Consumption** (LabGuru) → Track usage per experiment/sample
4. **Reorder** (NetSuite) → Auto-trigger when below threshold
""",
            },
            "terminology": {
                "title": "Business Terminology",
                "content_md": """# Sanguine Terminology

| Term | Definition |
|------|-----------|
| **Biospecimen** | A biological sample (blood, tissue, cells) collected from a donor |
| **PBMC** | Peripheral Blood Mononuclear Cells — a key processed sample type |
| **Donor** | An individual who provides biological samples |
| **Protocol** | Specific instructions for how samples should be collected and processed |
| **Assay** | A laboratory test/experiment run on samples |
| **LIMS** | Laboratory Information Management System (LabGuru) |
| **SOW** | Statement of Work — project contract document |
| **MSA** | Master Service Agreement — umbrella contract |
| **IRB** | Institutional Review Board — ethics approval for human sample collection |
| **COA** | Certificate of Analysis — quality document for processed samples |
| **Aliquot** | A portion of a sample divided for multiple uses |
| **Cryopreservation** | Freezing samples for long-term storage |
| **Chain of Custody** | Documented trail of sample handling from collection to delivery |
| **ASC 606** | Revenue recognition accounting standard |
| **NPS** | Net Promoter Score — customer satisfaction metric |
""",
            },
            "data_flow": {
                "title": "Data Flow & Integrations",
                "content_md": """# System Integration Map

## Data Flows
```
HubSpot (Leads) ──→ Salesforce (Opportunities, Accounts, Contacts)
Salesforce (Projects) ──→ LabGuru (Experiments, Samples)
LabGuru (Results) ──→ Salesforce (Project Status)
Salesforce (Invoicing Trigger) ──→ NetSuite (Invoice, Revenue)
NetSuite (Payment Status) ──→ Salesforce (Account Health)
WooCommerce (Orders) ──→ Salesforce (eCommerce Opportunities)
WooCommerce (Orders) ──→ NetSuite (Revenue)
SharePoint (Documents) ←─→ All Systems (SOPs, Contracts, Reports)
Google Drive/Sheets ←─→ Ad-hoc reporting and collaboration
```

## Integration Principles
- **Salesforce is the hub** — it touches every other system
- **NetSuite is financial truth** — all revenue and cost data flows here
- **LabGuru is operational truth** — all sample/experiment data lives here
- **One-way where possible** — minimize bidirectional sync complexity
- **Event-driven preferred** — webhooks > polling > batch
""",
            },
            "compliance": {
                "title": "Compliance & Governance",
                "content_md": """# Compliance Requirements

## Regulatory
- **HIPAA** — Protected Health Information (PHI) must be encrypted, access-controlled, and audited
- **IRB Compliance** — All sample collection must have active IRB approval
- **GDPR** — EU donor data requires explicit consent and right-to-deletion support
- **21 CFR Part 11** — Electronic records and signatures for lab data must comply
- **CAP/CLIA** — Lab operations must meet accreditation standards

## Data Handling Rules
- Never expose donor PII (name, DOB, SSN, medical records) outside authorized systems
- All cross-system data transfers must be logged
- Financial data (pricing, margins, costs) is restricted to Finance and leadership
- Lab results must maintain chain of custody documentation
- All system changes must go through change control (this platform!)

## AI Agent Specific Rules
- Agents MUST NOT modify donor records without human approval
- Agents MUST NOT send external communications with PII
- Agents MUST log all tool calls for audit trail
- Write operations to NetSuite require admin/revops approval workflow
- Read operations are generally safe but must respect data classification
""",
            },
        }

        for key, ctx_data in SEED_CONTEXT.items():
            existing = await session.execute(
                select(BusinessContext).where(BusinessContext.context_key == key)
            )
            if existing.scalar_one_or_none() is None:
                ctx = BusinessContext(
                    context_key=key,
                    title=ctx_data["title"],
                    content_md=ctx_data["content_md"],
                    updated_by="kevin@sanguinebio.com",
                )
                session.add(ctx)
                print(f"Created business context: {key}")
            else:
                print(f"Business context '{key}' already exists, skipping.")

        # 6. Seed global guardrails
        SEED_GUARDRAILS = [
            {
                "scope": "global",
                "category": "pii",
                "name": "No PII in Agent Output",
                "description": "Block agent output containing donor PII (SSN, DOB, medical record numbers). All agent responses are filtered.",
                "rule_type": "block",
                "rule_definition": {"patterns": ["SSN", "\\b\\d{3}-\\d{2}-\\d{4}\\b", "medical_record_number", "DOB"]},
                "priority": 10,
            },
            {
                "scope": "global",
                "category": "cost",
                "name": "Max LLM Calls Per Execution",
                "description": "Hard cap of 100 LLM API calls per single agent execution to prevent runaway costs.",
                "rule_type": "block",
                "rule_definition": {"max_llm_calls": 100},
                "priority": 20,
            },
            {
                "scope": "global",
                "category": "rate_limit",
                "name": "Max Execution Time",
                "description": "Agent execution must complete within 600 seconds (10 minutes).",
                "rule_type": "block",
                "rule_definition": {"max_seconds": 600},
                "priority": 20,
            },
            {
                "scope": "global",
                "category": "safety",
                "name": "No External Communications Without Review",
                "description": "Warn when an agent attempts to send emails or messages to external recipients (non-sanguinebio.com).",
                "rule_type": "warn",
                "rule_definition": {"check": "external_recipient", "allowed_domains": ["sanguinebio.com"]},
                "priority": 30,
            },
            {
                "scope": "global",
                "category": "compliance",
                "name": "Audit All Write Operations",
                "description": "Log all write/update/delete operations performed by agents for compliance audit trail.",
                "rule_type": "log",
                "rule_definition": {"tool_tiers": ["write", "sensitive"]},
                "priority": 50,
            },
            {
                "scope": "global",
                "category": "data_access",
                "name": "Financial Data Restriction",
                "description": "Block agents from reading financial data (margins, costs, pricing) unless the agent is explicitly tagged 'finance-approved'.",
                "rule_type": "block",
                "rule_definition": {"restricted_fields": ["margin", "cost_price", "unit_cost"], "bypass_tag": "finance-approved"},
                "priority": 25,
            },
        ]

        for rule_data in SEED_GUARDRAILS:
            existing = await session.execute(
                select(GuardrailRule).where(GuardrailRule.name == rule_data["name"])
            )
            if existing.scalar_one_or_none() is None:
                rule = GuardrailRule(
                    created_by="kevin@sanguinebio.com",
                    **rule_data,
                )
                session.add(rule)
                print(f"Created guardrail: {rule_data['name']}")
            else:
                print(f"Guardrail '{rule_data['name']}' already exists, skipping.")

        await session.commit()
        print("\nSeed complete!")


def _get_architecture_doc(slug: str) -> str:
    """Return starter architecture documentation for each system."""
    docs = {
        "salesforce": """# Salesforce Architecture

## Instance
- **Edition:** Enterprise
- **Org Type:** Production (with Dev, QA, B2C sandboxes)
- **URL:** login.salesforce.com

## Custom Objects
- **Project__c** — Represents a client project/study
- **Sample__c** — Individual biospecimen records
- **Donor__c** — Donor profiles (protected PII)
- **Protocol__c** — Collection/processing protocols

## Key Integrations
- HubSpot → Salesforce (leads, contacts)
- Salesforce → LabGuru (project/sample handoff)
- Salesforce → NetSuite (invoicing triggers)
- WooCommerce → Salesforce (ecommerce orders)

## API Access
- REST API and Bulk API available
- Connected App for OAuth
- API user with appropriate permissions
""",
        "hubspot": """# HubSpot Architecture

## Account Type
- Marketing Hub Professional

## Key Objects
- **Contacts** — Synced bidirectionally with Salesforce
- **Companies** — Mapped to SF Accounts
- **Deals** — Marketing-qualified pipeline (synced to SF Opportunities)
- **Campaigns** — Email campaigns, landing pages, forms

## Integrations
- Native HubSpot ↔ Salesforce sync
- Custom workflows trigger on form submissions
- Marketing emails with tracking

## API Access
- Private app API key
- Rate limit: 100 calls/10 seconds
""",
        "sharepoint": """# SharePoint Architecture

## Tenant
- Microsoft 365 Business

## Key Sites
- **Intranet** — Company-wide policies, announcements
- **Projects** — Project-specific document libraries
- **Quality** — SOPs, COAs, audit documents
- **HR** — Employee documents (restricted)

## Integration Pattern
- Graph API for file operations
- Webhook subscriptions for change notifications
- OAuth2 with Azure AD

## API Access
- Microsoft Graph API
- Application permissions (not delegated)
""",
        "netsuite": """# NetSuite Architecture

## Account
- NetSuite ERP

## Key Record Types
- **Customer** — Maps to Salesforce Accounts
- **Invoice** — Generated from Salesforce project milestones
- **Sales Order** — From WooCommerce and direct sales
- **Purchase Order** — Lab supply procurement
- **Inventory Item** — Lab supplies and consumables
- **Journal Entry** — Revenue recognition entries

## Integration Pattern
- SuiteTalk REST API
- Token-Based Authentication (TBA)
- Saved searches for reporting queries

## Financial Rules
- Revenue recognition per ASC 606 (milestone-based)
- Multi-currency support (USD primary)
- Intercompany eliminations for consolidated reporting
""",
        "google-drive": """# Google Drive Architecture

## Workspace
- Google Workspace Business

## Shared Drives
- **Company Shared** — Organization-wide documents
- **Sales Materials** — Proposals, decks, collateral
- **Lab Documentation** — Protocols, results exports
- **Finance Reports** — Monthly/quarterly reporting

## Integration Pattern
- Google Drive API v3
- Service account authentication
- Shared drive access via domain-wide delegation
""",
        "google-sheets": """# Google Sheets Architecture

## Key Spreadsheets
- **Project Tracker** — Operational project status (supplementary to Salesforce)
- **Donor Pipeline** — Recruitment tracking
- **Lab Inventory Counts** — Quick counts between NetSuite syncs
- **Campaign Performance** — Marketing metrics rollup

## Integration Pattern
- Google Sheets API v4
- Service account with sheet-level sharing
- Read/write cell ranges and named ranges
""",
        "woocommerce": """# WooCommerce Architecture

## Instance
- WordPress + WooCommerce
- Hosted on managed WordPress hosting

## Key Entities
- **Products** — Biospecimen kits, research supplies, services
- **Orders** — Online purchases
- **Customers** — Maps to Salesforce Contacts/Accounts
- **Coupons** — Promotional pricing

## Integration Pattern
- WooCommerce REST API v3
- Webhook notifications for order events
- Consumer key + secret authentication

## Data Flow
- New orders → Salesforce (Opportunity) + NetSuite (Sales Order)
- Product catalog managed in WooCommerce
- Customer data synced to HubSpot for marketing
""",
        "labguru": """# LabGuru (LIMS) Architecture

## Instance
- LabGuru Cloud (SaaS)

## Key Modules
- **Samples** — Biospecimen tracking from collection to storage
- **Experiments** — Lab protocols and results
- **Inventory** — Reagents, consumables, equipment
- **Projects** — Maps to Salesforce Project__c
- **Protocols** — Standard and custom lab procedures

## Data Classification
- **CRITICAL:** Sample data, experiment results, donor linkage
- **SENSITIVE:** Protocols, inventory (proprietary processes)
- **INTERNAL:** Project metadata, scheduling

## Integration Pattern
- LabGuru REST API
- API key authentication
- Rate limit: 60 calls/minute

## Compliance
- 21 CFR Part 11 compliant electronic records
- Full audit trail on all data changes
- Chain of custody tracking for all samples
""",
    }
    return docs.get(slug, "")


def _get_data_model_doc(slug: str) -> str:
    """Return starter data model documentation for each system."""
    docs = {
        "salesforce": """# Salesforce Data Model

## Standard Objects
| Object | Key Fields | Notes |
|--------|-----------|-------|
| Account | Name, Type, Industry, BillingAddress | Client companies |
| Contact | FirstName, LastName, Email, Phone, AccountId | Client contacts and donors |
| Opportunity | Name, StageName, Amount, CloseDate, AccountId | Sales pipeline |
| Case | Subject, Status, Priority, ContactId, AccountId | Support cases |

## Custom Objects
| Object | Key Fields | Relationships |
|--------|-----------|--------------|
| Project__c | Name, Status__c, Start_Date__c, Account__c | Lookup to Account |
| Sample__c | Sample_ID__c, Type__c, Status__c, Project__c | Master-Detail to Project__c |
| Donor__c | Donor_ID__c, Demographics__c (encrypted), Consent_Status__c | Restricted access |
| Protocol__c | Name, Version__c, Steps__c, Approved__c | Lookup to Project__c |

## Key Relationships
- Account → Contacts (1:many)
- Account → Opportunities (1:many)
- Account → Projects (1:many)
- Project → Samples (1:many)
- Project → Protocols (many:many via junction)
""",
        "hubspot": """# HubSpot Data Model

## Objects
| Object | Key Properties | Sync |
|--------|---------------|------|
| Contact | email, firstname, lastname, lifecyclestage | ↔ SF Contact |
| Company | name, domain, industry | ↔ SF Account |
| Deal | dealname, amount, dealstage, pipeline | ↔ SF Opportunity |

## Custom Properties
- contact.lead_source_detail
- contact.sample_donor (boolean)
- company.sf_account_id
- deal.project_type
""",
        "netsuite": """# NetSuite Data Model

## Key Records
| Record Type | Key Fields | Mapping |
|------------|-----------|---------|
| Customer | companyName, email, subsidiary | ↔ SF Account |
| Invoice | entity, tranDate, total, status | Created from SF Project milestones |
| Sales Order | entity, item, quantity, rate | From WooCommerce orders |
| Purchase Order | entity, item, quantity | Lab supply orders |
| Inventory Item | itemId, displayName, quantityOnHand | Lab supplies |

## Subsidiaries
- Sanguine Biosciences Inc. (primary)

## Custom Records
- Revenue Schedule (ASC 606 milestone tracking)
""",
        "labguru": """# LabGuru Data Model

## Core Entities
| Entity | Key Fields | Notes |
|--------|-----------|-------|
| Sample | sample_id, type, status, collection_date, donor_id | Core specimen tracking |
| Experiment | name, protocol_id, status, start_date, results | Lab work records |
| Protocol | name, version, steps, approved_by | SOPs for lab procedures |
| Inventory Item | name, category, quantity, location, expiry_date | Lab supplies tracking |
| Project | name, external_id (SF Project__c), status | Linked to Salesforce |

## Sample Lifecycle
Collection → Receiving → Processing → QC → Storage → Shipping → Delivered

## Data Sensitivity
- Donor linkage data is HIPAA-protected
- Experiment results are proprietary
- Protocol details are trade secrets
""",
        "woocommerce": """# WooCommerce Data Model

## Entities
| Entity | Key Fields | Notes |
|--------|-----------|-------|
| Product | name, sku, price, stock_quantity, categories | Research kits and supplies |
| Order | order_number, status, total, customer_id, line_items | Online purchases |
| Customer | email, first_name, last_name, billing/shipping | Synced to SF + HubSpot |
| Coupon | code, discount_type, amount, usage_limit | Promotional pricing |

## Order Statuses
Pending → Processing → Completed → (Refunded)
""",
    }
    return docs.get(slug, "")


if __name__ == "__main__":
    asyncio.run(seed())
