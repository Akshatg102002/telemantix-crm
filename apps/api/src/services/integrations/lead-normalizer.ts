import { NormalizedLead } from './types';

function firstString(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = key.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), payload);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function metaLead(payload: Record<string, unknown>): Partial<NormalizedLead> {
  const fieldData = Array.isArray(payload.field_data) ? payload.field_data as Array<Record<string, unknown>> : [];
  const mapped = fieldData.reduce<Record<string, string>>((acc, field) => {
    const name = String(field.name || '').toLowerCase();
    const values = Array.isArray(field.values) ? field.values : [];
    if (name && values[0]) acc[name] = String(values[0]);
    return acc;
  }, {});
  return { name: mapped.full_name || mapped.name, phone: mapped.phone_number || mapped.phone, email: mapped.email };
}

export function normalizeLead(type: string, payload: Record<string, unknown>): NormalizedLead | null {
  const meta = type === 'meta' ? metaLead(payload) : {};
  const name = meta.name || firstString(payload, ['name', 'full_name', 'sender_name', 'customer_name', 'lead_name', 'contact.name', 'user.name']) || 'Unknown Lead';
  const phone = meta.phone || firstString(payload, ['phone', 'mobile', 'mobile_no', 'mobileNo', 'phone_number', 'contact_number', 'caller_id', 'From', 'from', 'contact.phone', 'user.mobile']);
  const email = meta.email || firstString(payload, ['email', 'email_id', 'emailId', 'contact.email', 'user.email']);
  if (!phone) return null;

  const externalId = firstString(payload, ['id', 'lead_id', 'leadgen_id', 'unique_id', 'enquiry_id', 'query_id', 'call_sid']);
  const notes = firstString(payload, ['message', 'query', 'notes', 'requirement', 'comments', 'ad_name', 'form_name']);

  return {
    name,
    phone,
    email,
    notes: notes ? `Imported from ${type}: ${notes}` : `Imported from ${type}`,
    sourceName: type,
    externalId,
    rawPayload: payload,
  };
}
