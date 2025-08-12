import { Lead } from './airtable.js';

const { CALENDLY_LINK } = process.env;
if (!CALENDLY_LINK) throw new Error('CALENDLY_LINK is required');

export type Step = {
  offsetDays: number;
  channel: 'email' | 'linkedin' | 'facebook';
  name: string;
  build: (lead: Lead) => { subject?: string; html?: string; taskContent?: string };
};

export const sellerSequence: Step[] = [
  {
    offsetDays: 0, channel: 'email', name: 'seller_email_1',
    build: (l) => ({
      subject: `Quick question about ${l.company ? l.company + "'s" : 'your'} Utah property`,
      html: `
        <p>Hey ${l.name || 'there'} — Elliot here with Summit Peak Properties.</p>
        <p>We buy Utah houses as‑is for cash with flexible closing. Would you be open to a short chat?</p>
        <p><a href="${CALENDLY_LINK}">Grab a 30‑min slot</a> or reply with a time that works.</p>
      `
    })
  },
  {
    offsetDays: 3, channel: 'linkedin', name: 'li_connect',
    build: (l) => ({
      taskContent: `LinkedIn: connect with ${l.name || l.email} — "I help UT owners sell as‑is, quick. Open to a short call? ${CALENDLY_LINK}"`
    })
  },
  {
    offsetDays: 6, channel: 'email', name: 'seller_email_2',
    build: (l) => ({
      subject: `Any interest in a no‑obligation offer?`,
      html: `
        <p>Following up, ${l.name || ''}. We can give a clear cash offer — no repairs or fees.</p>
        <p>Open to a quick walkthrough? <a href="${CALENDLY_LINK}">Book here</a>.</p>
        <p>If now’s not the time, just say so and I’ll close your file.</p>
      `
    })
  },
  {
    offsetDays: 9, channel: 'facebook', name: 'fb_group_post_invite',
    build: () => ({
      taskContent: `Facebook Group: schedule a post offering a free "sell‑as‑is" consult. CTA: ${CALENDLY_LINK}`
    })
  }
];

export const investorSequence: Step[] = [
  {
    offsetDays: 0, channel: 'email', name: 'investor_email_1',
    build: (l) => ({
      subject: `Off‑market Utah deals (as‑is, quick close)`,
      html: `
        <p>Hi ${l.name || ''}, I’m Elliot (Summit Peak Properties). We source off‑market Utah properties.</p>
        <p>Want on the VIP list? I send 1–2 vetted deals/week.</p>
        <p><a href="${CALENDLY_LINK}">Book 30‑min</a> to share your buy box, or reply with criteria.</p>
      `
    })
  },
  {
    offsetDays: 4, channel: 'linkedin', name: 'li_followup',
    build: (l) => ({
      taskContent: `LinkedIn: message ${l.name || l.email} — "We get consistent off‑market deals in UT. Want ones that match your buy box? Quick chat: ${CALENDLY_LINK}"`
    })
  },
  {
    offsetDays: 7, channel: 'email', name: 'investor_email_2',
    build: () => ({
      subject: `What’s your buy box?`,
      html: `
        <p>To send the right inventory, can you share: neighborhoods, price cap, beds/baths, rehab tolerance, target yield?</p>
        <p>Fastest is a quick call: <a href="${CALENDLY_LINK}">book here</a>.</p>
      `
    })
  }
];
