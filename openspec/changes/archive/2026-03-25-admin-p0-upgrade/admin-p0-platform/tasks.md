# admin-p0-platform - Tasks

## Implementation
- [x] T1: Fix admin dashboard/user/order page and API field mismatch
- [x] T2: Add admin workspace management API and page
- [x] T3: Add admin task center API and page
- [x] T4: Add admin token/AI usage API and page
- [x] T5: Add platform config storage and admin config API/page
- [x] T6: Add admin announcements API/page with notification fan-out
- [x] T7: Add admin template management API/page
- [x] T8: Disable workspace-side template upload (admin-only flow)
- [x] T9: Wire generation routes to platform config reserves and model override payload

## Validation
- [x] V1: `npm run db:generate`
- [x] V2: `npm run build` (pass)
- [ ] V3: `npm run test:run` (currently failing on legacy tests unrelated to this change set)
