# Project Management App — Scope Definition

> Based on project management theory as defined by PMI, PMBOK, and established industry standards.
> Source: https://en.wikipedia.org/wiki/Project_management

---

## 1. Core Constraints (The Iron Triangle / Triple Constraint)

| Dimension | Description |
|-----------|-------------|
| **Scope** | What must be delivered — deliverables, features, requirements |
| **Time** | Schedule, milestones, deadlines, phases |
| **Cost/Budget** | Financial resources, cost estimates, budget tracking |

A project management app must enable balancing all three simultaneously and surface trade-offs when one constraint shifts.

---

## 2. Project Lifecycle & Process Groups

The app must support the five standard process groups across the full project lifecycle:

### 2.1 Initiating
- Project charter creation
- Business case definition
- Stakeholder identification
- Feasibility assessment
- Initial scope statement

### 2.2 Planning
- Scope planning (WBS, requirements)
- Schedule development (Gantt, CPM, PERT)
- Cost estimation and budgeting
- Resource planning
- Risk identification and response planning
- Quality planning
- Communication planning
- Procurement planning
- Change management plan

### 2.3 Executing
- Task assignment and execution
- Team coordination
- Quality assurance activities
- Stakeholder engagement
- Vendor/contractor management
- Deliverable production

### 2.4 Monitoring & Controlling
- Progress tracking (Earned Value Management)
- Schedule variance analysis
- Cost variance analysis
- Scope verification
- Quality control
- Risk monitoring
- Change request processing
- Performance reporting

### 2.5 Closing
- Formal acceptance of deliverables
- Lessons learned documentation
- Contract closure
- Resource release
- Final reporting and archiving

---

## 3. Knowledge Areas

### 3.1 Scope Management
- Requirements collection and traceability
- Work Breakdown Structure (WBS)
- Scope baseline
- Scope verification and validation
- Scope change control

### 3.2 Schedule Management
- Activity definition and sequencing
- Duration estimation
- Gantt chart visualization
- Critical Path Method (CPM)
- Schedule baseline
- Schedule compression (crashing, fast-tracking)
- Milestone tracking

### 3.3 Cost Management
- Cost estimation (analogous, parametric, bottom-up)
- Budget determination
- Earned Value Management (EVM): CPI, SPI, EAC, ETC
- Cost baseline
- Cash flow forecasting

### 3.4 Quality Management
- Quality planning (standards, metrics)
- Quality assurance processes
- Quality control inspections
- Defect tracking
- Continuous improvement

### 3.5 Resource Management
- Human resource allocation
- Resource calendars and availability
- Skill inventory
- RACI matrix (Responsible, Accountable, Consulted, Informed)
- Workload balancing
- Equipment and material tracking

### 3.6 Communications Management
- Communication plan and matrix
- Status reports and dashboards
- Meeting management
- Notifications and alerts
- Document sharing
- Stakeholder communication logs

### 3.7 Risk Management
- Risk identification
- Qualitative and quantitative risk analysis
- Risk response strategies (avoid, mitigate, transfer, accept)
- Risk register
- Risk owners assignment
- Risk monitoring and reassessment
- Issue tracking

### 3.8 Procurement Management
- Vendor/supplier management
- Contract types (fixed-price, T&M, cost-reimbursable)
- Bid/proposal tracking
- Purchase orders
- Contract performance monitoring
- Procurement closure

### 3.9 Stakeholder Management
- Stakeholder identification and classification
- Interest/Influence matrix
- Engagement strategy (manage, monitor, keep satisfied, keep informed)
- Stakeholder register
- Feedback and approval workflows

### 3.10 Integration Management
- Project charter and project plan integration
- Change control board (CCB) workflow
- Integrated change control
- Project plan updates
- Cross-project dependencies

---

## 4. Breakdown Structures

| Structure | Purpose |
|-----------|---------|
| **WBS** (Work Breakdown Structure) | Decompose deliverables into manageable work packages |
| **OBS** (Organizational Breakdown Structure) | Map work to organizational units |
| **RBS** (Resource Breakdown Structure) | Categorize resources by type and availability |
| **CBS** (Cost Breakdown Structure) | Allocate costs to WBS elements |
| **RBS** (Risk Breakdown Structure) | Categorize risks by source and type |

---

## 5. Project Classification & Typology

The app should support multiple project types:

- **Traditional / Waterfall** — sequential phases
- **Agile / Scrum** — iterative sprints, backlogs, standups
- **Hybrid** — phase-gate at portfolio level, agile at execution level
- **Lean** — waste elimination, value stream mapping
- **Critical Chain (CCPM)** — buffer management, resource-constrained scheduling
- **PRINCE2** — product-based planning, stage gates

---

## 6. Program & Portfolio Management

### 6.1 Program Management
- Group related projects under a program
- Shared benefits tracking across projects
- Program-level resource allocation
- Inter-project dependency management
- Program-level risk aggregation

### 6.2 Portfolio Management
- Project selection and prioritization
- Strategic alignment scoring
- Capacity planning across the organization
- Portfolio-level dashboards and KPIs
- Investment vs. return analysis
- What-if scenario modeling

---

## 7. Benefits Realization Management (BRM)

- Define expected benefits per project
- Map benefits to organizational strategy
- Track benefit achievement post-delivery
- Measure outcomes vs. outputs
- Benefit realization timeline

---

## 8. Project Complexity & Classification

The app should account for project complexity dimensions:

- **Size** — team size, budget, duration
- **Uncertainty** — requirements clarity, technology maturity
- **Interdependency** — cross-team, cross-project, external dependencies
- **Ambiguity** — novelty, number of unknowns
- **Regulatory** — compliance requirements, audit trails

---

## 9. Virtual / Distributed Project Management

- Remote team collaboration tools
- Asynchronous communication support
- Time zone management
- Shared digital workspaces
- Virtual meeting integration
- Activity logs and audit trails

---

## 10. Reporting & Analytics

### 10.1 Standard Reports
- Project status summary
- Milestone/deliverable tracker
- Resource utilization report
- Budget vs. actual
- Risk summary
- Issue log

### 10.2 Dashboards
- Executive portfolio overview
- Project health indicators (RAG status)
- Burndown / burnup charts (Agile)
- S-curve and EVM curves
- KPI scorecards

### 10.3 Custom Analytics
- Ad-hoc query and filtering
- Trend analysis over time
- Cross-project comparisons
- Predictive analytics (schedule/cost forecasts)

---

## 11. Governance & Compliance

- Approval workflows (multi-level)
- Stage-gate reviews
- Audit trail / change history
- Role-based access control (RBAC)
- Document version control
- Regulatory compliance tracking
- Archival and retention policies

---

## 12. Integration & Extensibility

- **API** for external system integration
- **Import/Export** (CSV, MS Project, Excel, PDF)
- **SSO / Auth** integration (LDAP, OAuth, SAML)
- **Version control** integration (Git, etc.)
- **CI/CD** pipeline awareness (for IT projects)
- **Calendar** sync (Google, Outlook)
- **Communication** tools (Slack, Teams, email)
- **Time tracking** systems
- **Accounting/ERP** systems

---

## 13. Success Criteria & KPIs

The app must enable tracking of:

| Metric | Description |
|--------|-------------|
| On-time delivery | % of milestones met on schedule |
| Budget adherence | Actual vs. planned cost |
| Scope fulfillment | Requirements met vs. planned |
| Quality | Defect rates, rework percentage |
| Stakeholder satisfaction | Survey scores, approval rates |
| Benefits realized | Post-project outcome measurements |
| Team utilization | Billable hours / available hours |
| Risk effectiveness | Risks mitigated vs. risks materialized |

---

## Summary Diagram

```
                        ┌─────────────────────────┐
                        │   PORTFOLIO MANAGEMENT   │
                        │  Strategy · Priorities   │
                        └────────────┬────────────┘
                                     │
                        ┌────────────▼────────────┐
                        │   PROGRAM MANAGEMENT     │
                        │  Coordinated Benefits    │
                        └────────────┬────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
    ┌─────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
    │     PROJECT A      │ │     PROJECT B      │ │     PROJECT C      │
    │                    │ │                    │ │                    │
    │  Scope  Time  Cost │ │  Scope  Time  Cost │ │  Scope  Time  Cost │
    │  Quality Resources │ │  Quality Resources │ │  Quality Resources │
    │  Risk  Comms  Proc │ │  Risk  Comms  Proc │ │  Risk  Comms  Proc │
    │  Stakeholders      │ │  Stakeholders      │ │  Stakeholders      │
    └────────────────────┘ └────────────────────┘ └────────────────────┘
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     │
                        ┌────────────▼────────────┐
                        │   PROCESS GROUPS         │
                        │  Initiate → Plan →       │
                        │  Execute → Monitor →     │
                        │  Close                   │
                        └─────────────────────────┘
```

---

## Referenced Theory

- PMBOK Guide (PMI)
- PRINCE2
- Critical Path Method (CPM)
- Earned Value Management (EVM)
- Critical Chain Project Management (CCPM)
- Agile / Scrum
- Lean Project Management
- Benefits Realisation Management (BRM)
- Theory of Constraints (TOC)
- OPM3 / CMMI maturity models
