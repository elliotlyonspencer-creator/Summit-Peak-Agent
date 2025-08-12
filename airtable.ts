import Airtable from 'airtable';

const {
  AIRTABLE_API_TOKEN,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_LEADS = 'Leads',
  AIRTABLE_TABLE_TASKS = 'Tasks'
} = process.env;

if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
  throw new Error('Missing Airtable env vars');
}

const base = new Airtable({ apiKey: AIRTABLE_API_TOKEN }).base(AIRTABLE_BASE_ID);

export type Lead = {
  id?: string;
  name?: string;
  email: string;
  company?: string;
  source?: string;
  status?: string;
  tags?: string[] | string;
  lastStep?: string;
  nextDue?: string;
  notes?: string;
};

export type Task = {
  id?: string;
  leadId: string;
  channel: 'linkedin' | 'facebook';
  action: 'connect' | 'message' | 'post';
  content: string;
  due?: string;
  status?: 'open' | 'done';
};

function toArray(val: any): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return undefined;
}

export async function findLeadByEmail(email: string) {
  const recs = await base(AIRTABLE_TABLE_LEADS)
    .select({ filterByFormula: `{email} = '${email.replace("'", "\'")}'`, maxRecords: 1 })
    .firstPage();
  return recs[0] ? { airtableId: recs[0].id, ...(recs[0].fields as any) } as any : null;
}

export async function createLead(l: Lead) {
  const created = await base(AIRTABLE_TABLE_LEADS).create({
    id: l.id || undefined,
    name: l.name,
    email: l.email,
    company: l.company,
    source: l.source || 'manual',
    status: l.status || 'New',
    tags: toArray(l.tags),
    lastStep: l.lastStep,
    nextDue: l.nextDue,
    notes: l.notes
  } as any);
  return { airtableId: created.id, ...(created.fields as any) } as any;
}

export async function updateLead(airtableId: string, patch: Partial<Lead>) {
  const updated = await base(AIRTABLE_TABLE_LEADS).update(airtableId, patch as any);
  return { airtableId: updated.id, ...(updated.fields as any) } as any;
}

export async function createTask(t: Task) {
  const created = await base(AIRTABLE_TABLE_TASKS).create({
    leadId: t.leadId,
    channel: t.channel,
    action: t.action,
    content: t.content,
    due: t.due,
    status: t.status || 'open'
  } as any);
  return { airtableId: created.id, ...(created.fields as any) } as any;
}

export async function selectDueLeads(limit = 50) {
  const recs = await base(AIRTABLE_TABLE_LEADS).select({
    filterByFormula: "AND({status} != 'Unsub', {nextDue}, IS_BEFORE({nextDue}, NOW()))",
    maxRecords: limit
  }).firstPage();
  return recs.map(r => ({ airtableId: r.id, ...(r.fields as any) }));
}

export async function selectDueTasks(limit = 100) {
  const recs = await base(AIRTABLE_TABLE_TASKS).select({
    filterByFormula: "AND({status}='open', {due}, IS_BEFORE({due}, NOW()))",
    maxRecords: limit
  }).firstPage();
  return recs.map(r => ({ airtableId: r.id, ...(r.fields as any) }));
}
