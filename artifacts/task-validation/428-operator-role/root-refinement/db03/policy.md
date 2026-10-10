# Decision: AUTHORIZED
Only new isolated PostgreSQL cluster under task-specific temporary directory, reviewed po05 fixture, ephemeral localhost port, synthetic fixtures. Inherited DATABASE_URL not used. Exact owned shutdown, no deletion, no production mutation. User authorized scoped tests.
