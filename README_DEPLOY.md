## Deploy options

### A) Render (easiest, no-ops)
1. Push this folder to a GitHub repo.
2. In Render: New → Web Service → Connect repo.
3. It will read `render.yaml` automatically (or choose 'Use existing blueprint').
4. Set env vars marked `sync:false` (SMTP, Airtable token, UNSUBSCRIBE_SECRET).
5. Deploy. Health check: `/` should say the app is running.
6. Calendly → Webhooks → add `POST https://your-render-url/webhooks/calendly` (invitee.created).

### B) Docker anywhere (Fly.io, AWS, your VPS)
```bash
docker build -t summit-peak-agent .
docker run -p 8080:8080     -e FROM_EMAIL=elliot.spencer@summitpeakprop.com     -e CALENDLY_LINK=https://calendly.com/elliot-spencer-summitpeakprop/30min     -e AIRTABLE_API_TOKEN=pat_xxx     -e AIRTABLE_BASE_ID=app10O5XVoooMIJYq     -e AIRTABLE_TABLE_LEADS=Leads     -e AIRTABLE_TABLE_TASKS=Tasks     -e SMTP_HOST=smtp.mailgun.org -e SMTP_PORT=587     -e SMTP_USER=postmaster@YOURDOMAIN -e SMTP_PASS=YOUR_SMTP_PASSWORD     -e UNSUBSCRIBE_SECRET=change_me     summit-peak-agent
```

### C) Railway
1. Create a new project → Deploy from repo.
2. Service type: Node.
3. Set the same env vars as above.
4. App listens on `$PORT` (handled via index.ts).

---

### Test after deploy
```bash
curl -X POST https://YOUR-APP/campaigns/start     -H "Content-Type: application/json"     -d '{"lead":{"name":"Demo Seller","email":"demo@example.com","company":"789 Oak St","source":"list_import"},"campaign":"seller_outreach"}'
```
- Check Airtable → Leads/Tasks updated.
- Watch logs for "Email -> demo@example.com".
