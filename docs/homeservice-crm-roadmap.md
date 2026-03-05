# Home Service CRM Roadmap (Trendcast)

This roadmap adapts `homeservicepro-crm-technical-spec.md` to the current Trendcast stack and production constraints.

## What Is Already Live

- Multi-tenant organization auth and billing
- Lead ingestion (Lead Scraper + Business Finder + manual)
- Pipeline stages (`NEW`, `CONTACTED`, `QUOTED`, `WON`, `LOST`)
- Direct mail campaigns through Lob
- Keyword and blog generation tooling

## What Was Implemented In This Upgrade

- CRM Command Center UI
  - Pipeline KPIs (volume, conversion, follow-up pressure, forecast value)
  - Search/filter/sort across pipeline
  - Priority + score + estimated value + next action per lead
  - Dispatch readiness and follow-up queues
- CRM intelligence layer (`src/lib/crm/intelligence.ts`)
  - Heuristic lead scoring
  - Priority assignment
  - Deal value range estimates
  - Next-best-action recommendation
- Security hardening
  - Lead update/delete actions now enforce org ownership

## Remaining Modules (Prioritized)

## Phase 1: Data Model Expansion (safe additive migrations)

- Add models:
  - `CustomerProfile`
  - `Property`
  - `Job`
  - `JobLineItem`
  - `ServiceCatalog`
  - `ScheduleEvent`
  - `Invoice`
  - `Payment`
  - `CommunicationThread`
  - `ReviewRequest`
  - `EquipmentAsset`
  - `InventoryItem`
- Add indexes:
  - `orgId + status`
  - `orgId + createdAt`
  - `orgId + jobType`

## Phase 2: Estimation + Scheduling

- AI estimate builder:
  - Service templates by job type
  - Sq-ft and lineal-ft calculators
  - Cost model (labor/material/overhead/profit)
  - Confidence score and margin guardrails
- Calendar + dispatch:
  - Job board with technician assignment
  - Route grouping by ZIP/geo clusters
  - ETA and workload balancing

## Phase 3: Communications + Revenue Ops

- Unified communication inbox:
  - SMS, email, call log timeline per customer
  - AI draft replies and follow-up suggestions
- Invoicing and payments:
  - Quote -> invoice conversion
  - Stripe payment links and status sync
  - Aging reports and dunning reminders

## Phase 4: Customer Experience + Scale

- Customer portal:
  - Approvals, scheduling, invoices, service history
- Review management:
  - Auto-send review requests after completion
  - NPS/rating tracking
- Equipment and inventory:
  - Asset utilization and maintenance schedule
  - Consumable stock alerts and reorder points

## Integration Targets

- Stripe: subscriptions + invoice payments
- Twilio: SMS and call events
- Google APIs:
  - Maps/Distance Matrix for route optimization
  - Optional Earth/imagery metadata for estimation workflows
- OpenAI/Anthropic:
  - Estimate reasoning
  - Follow-up generation
  - Voicemail and note summarization

## Operational Guardrails

- Enforce org-level data isolation on all writes and reads
- Add rate limiting for high-cost endpoints (AI, scraping, mail)
- Add audit trails for estimate, invoice, and payment state changes
- Track AI token/cost usage per org

