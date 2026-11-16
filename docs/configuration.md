# Local configuration

Create `.env.local` in the repository root. Values below are names and placeholders, not credentials.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
GROQ_API_KEY=your-server-only-key
GROQ_MODEL=llama-3.3-70b-versatile
```

The monthly analysis route also reads server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, falling back to public configuration where implemented. Service-role credentials bypass row-level policies and must remain server-side; authenticate and authorise the route before enabling it for untrusted callers. Use a separate development project and synthetic receipts.

The current queries expect `receipts` and `receipt_items` tables. Inspect `src/lib/receiptQueries.ts` and `src/types/index.ts` before provisioning them. Database migrations are not included; this document is not a turnkey schema or a production deployment guide.

The API routes, not the React client, must hold the Groq key. Never add it to a `NEXT_PUBLIC_*` variable or commit `.env.local`.
