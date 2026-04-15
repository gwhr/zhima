# Specs: User Feedback Feature

## Functional requirements

1. Authenticated users must be able to submit feedback from `/dashboard/feedback`.
2. Feedback submission must support:
   - required text content
   - optional contact information
   - optional page path
   - up to 3 uploaded images
3. Users must be able to view their own feedback history as a paginated list.
4. Feedback history must show:
   - status (`OPEN` / `RESOLVED`)
   - submitted content
   - uploaded images
   - admin note when present
5. Admins must be able to view feedback from `/admin/feedback`.
6. Admin feedback list must support:
   - pagination
   - keyword search
   - status filtering
   - status update
   - admin note update
7. Feedback images must only be readable by the feedback author or an admin.
8. Admin-side feedback updates must be written to audit log.

## Non-functional requirements

1. Pagination metadata must stay consistent between list results and total count.
2. Image upload must enforce file type and size limits.
3. Invalid or cross-user image keys must be rejected safely.
4. The feature must remain usable even when the feedback list is empty.
