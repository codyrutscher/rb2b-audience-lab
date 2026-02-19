// Notification Service for Slack, Email, and Webhooks

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface VisitorNotification {
  visitorId: string;
  name?: string;
  email?: string;
  company?: string;
  linkedinUrl?: string;
  city?: string;
  country?: string;
  deviceType?: string;
  currentPage: string;
  landingPage?: string;
  utmSource?: string;
  utmCampaign?: string;
  isReturning?: boolean;
}

export async function sendVisitorNotifications(workspaceId: string, visitor: VisitorNotification) {
  // Get all enabled integrations for this workspace
  const { data: integrations } = await supabase
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true);

  if (!integrations || integrations.length === 0) {
    return;
  }

  // Send to each integration
  for (const integration of integrations) {
    try {
      switch (integration.type) {
        case 'slack':
          await sendSlackNotification(integration.config.webhook_url, visitor);
          break;
        case 'webhook':
          await sendWebhookNotification(integration.config.url, visitor);
          break;
        case 'email':
          // Email notifications coming soon
          break;
      }

      // Log notification
      await supabase.from('notifications').insert({
        workspace_id: workspaceId,
        visitor_id: visitor.visitorId,
        type: integration.type,
        message: `Sent ${integration.type} notification`,
        integration_id: integration.id,
      });
    } catch (error) {
      console.error(`Failed to send ${integration.type} notification:`, error);
    }
  }
}

async function sendSlackNotification(webhookUrl: string, visitor: VisitorNotification) {
  const visitorName = visitor.name || 'Anonymous Visitor';
  const location = visitor.city && visitor.country 
    ? `${visitor.city}, ${visitor.country}` 
    : visitor.country || 'Unknown';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `👋 ${visitorName} is on your site!`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Company:*\n${visitor.company || 'Unknown'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Location:*\n${location}`,
        },
        {
          type: 'mrkdwn',
          text: `*Current Page:*\n${visitor.currentPage}`,
        },
        {
          type: 'mrkdwn',
          text: `*Device:*\n${visitor.deviceType || 'Unknown'}`,
        },
      ],
    },
  ];

  if (visitor.email) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Email:*\n${visitor.email}`,
        },
        {
          type: 'mrkdwn',
          text: visitor.linkedinUrl 
            ? `*LinkedIn:*\n<${visitor.linkedinUrl}|View Profile>` 
            : '*LinkedIn:*\nNot available',
        },
      ],
    });
  }

  if (visitor.utmSource || visitor.utmCampaign) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Source:*\n${visitor.utmSource || 'Direct'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Campaign:*\n${visitor.utmCampaign || 'None'}`,
        },
      ],
    });
  }

  if (visitor.isReturning) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '🔄 *Returning visitor*',
        },
      ],
    } as any);
  }

  const payload = {
    blocks,
    text: `${visitorName} is viewing your site`,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.statusText}`);
  }
}

async function sendWebhookNotification(url: string, visitor: VisitorNotification) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'visitor_identified',
      timestamp: new Date().toISOString(),
      visitor,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`);
  }
}
