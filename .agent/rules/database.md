---
trigger: always_on
---

keep in mind to always use the dev d1 database called "sculpt-dev" for development data. 
never use the production database sculpt-db.
keep in mind to always provide plenty of mockup data for the dev database for the test user test@sculpt.de.
all supabase or postgres occurences are legacy and needs to be removed and replaced by an d1 database connection implementation.
