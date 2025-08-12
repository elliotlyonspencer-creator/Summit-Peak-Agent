import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import { z } from 'zod';
import { sendEmail } from './email.js';
import {
  findLeadByEmail, createLead, updateLead,
  createTask, selectDueLeads, selectDueTasks, Lead
} from './airtable.js';
import { sellerSequence, investorSequence, Step } from './sequences.js';
import { addDays } from './utils.js';

const app = express();
app.use(bodyParser.json());

// PORT fallback for platforms like Render/Fly/AWS
const APP_PORT = Number(process.env.PORT || process.env.APP_PORT || 8080);
const CALENDLY_LINK = process.env.CALENDLY_LINK!;

const startSchema = z.object({
  lead: z.object({
    name: z.string().optional(),
    email: z.string().email(),
    company: z.string().optional(),
    source: z.string().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional()
  }),
  campaign: z.enum(['seller_outreach', 'investor_outreach'])
});

function sequenceFor(lead: Lead): Step[] {
  const tagStr = Array.isArray(lead.tags) ? lead.tags.join(',') : (lead.tags || '');
  if (tagStr.toLowerCase().includes('investor')) return investorSequence;
  return sellerSequence;
}

app.get('/', (_, res) => res.send('Summit Peak Outreach Agent (Airtable) running ✅'));

/* ---- Start campaign ---- */
app.post('/campaigns/start', async (req, res) => {
  try {
    const { lead, campaign } = startSchema.parse(req.body);
    const existing = await findLeadByEmail(lead.email);
    const stored = existing || await createLead(lead);

    const steps = campaign === 'seller_outreach' ? sellerSequence :
                  campaign === 'investor_outreach' ? investorSequence :
                  sequenceFor(stored);

    const now = new Date().toISOString();

    for (const s of steps) {
      const due = addDays(now, s.offsetDays);
      if (s.channel === 'email') {
        if (!stored.nextDue) await updateLead(stored.airtableId, { nextDue: due, lastStep: 'queued' });
      } else {
        const { taskContent } = s.build(stored);
        await createTask({
          leadId: stored.airtableId,
          channel: s.channel as any,
          action: s.name.includes('connect') ? 'connect' : s.name.includes('post') ? 'post' : 'message',
          content: taskContent || '',
          due
        });
      }
    }

    res.json({ ok: true, leadId: stored.airtableId, steps: steps.length });
  } catch (e:any) {
    console.error(e);
    res.status(400).json({ ok:false, error: e.message });
  }
});

/* ---- Scheduler: send due emails ---- */
cron.schedule('*/5 * * * *', async () => {
  try {
    const dueLeads = await selectDueLeads();
    for (const rec of dueLeads as any[]) {
      const lead: Lead & { airtableId: string } = rec;
      const steps = sequenceFor(lead).filter(s => s.channel === 'email');
      const sentCount = Number((lead.lastStep || '').split(':')[1] || 0);
      const nextEmail = steps[sentCount] || steps[0];
      const { subject = 'Hello from Summit Peak', html = `<p>Hi${lead.name?', '+lead.name:''} — quick chat?</p><p><a href="${CALENDLY_LINK}">Book a 30-min slot</a></p>` } = nextEmail.build(lead);

      try {
        await sendEmail(lead.email, subject, html);
        await updateLead(lead.airtableId, {
          lastStep: `email:${sentCount + 1}`,
          nextDue: addDays(new Date().toISOString(), 3),
          status: 'Working'
        });
        console.log(`Email -> ${lead.email}: ${subject}`);
      } catch (err:any) {
        console.error('Email send failed', lead.email, err?.message || err);
      }
    }

    const dueTasks = await selectDueTasks();
    if (dueTasks.length) {
      // optional: email yourself a digest
    }
  } catch (e:any) {
    console.error('Scheduler error', e?.message || e);
  }
});

/* ---- Calendly webhook: mark lead as Booked ---- */
app.post('/webhooks/calendly', async (req, res) => {
  try {
    const body = req.body || {};
    const email = body?.payload?.invitee?.email || body?.payload?.email || body?.invitee?.email || body?.email;
    if (email) {
      const found = await findLeadByEmail(email);
      if (found) await updateLead(found.airtableId, { status: 'Booked', notes: 'Calendly booked' });
    }
    res.json({ ok: true });
  } catch (e:any) {
    res.status(400).json({ ok:false, error: e.message });
  }
});

/* ---- Unsubscribe ---- */
app.get('/unsubscribe', async (req, res) => {
  try {
    const email = String(req.query.email || '');
    const token = String(req.query.token || '');
    const { createHmac } = await import('crypto');
    const secret = process.env.UNSUBSCRIBE_SECRET || 'secret';
    const expected = createHmac('sha256', secret).update(email).digest('hex');
    if (!email || token !== expected) return res.status(400).send('Invalid request');
    const found = await findLeadByEmail(email);
    if (found) await updateLead(found.airtableId, { status: 'Unsub' });
    res.send('You have been unsubscribed.');
  } catch (e:any) {
    res.status(400).send('Error processing unsubscribe');
  }
});

app.listen(APP_PORT, () => {
  console.log(`Agent listening on :${APP_PORT}`);
});
