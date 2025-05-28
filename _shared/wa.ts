// supabase/functions/_shared/wa.ts
// deno-lint-ignore-file no-explicit-any

// Note: If this shared module needs to create a Supabase client for logging errors to DB,
// it would also need the Supabase client initialization logic, or you'd pass the client as a parameter.
// For now, assuming 'log' is primarily console logging as in your 'send-message' function.

/**
 * Structured JSON logger for Edge Functions.
 * @param evt Event name or type.
 * @param extra Additional key-value pairs for structured logging.
 * @param fnName Optional calling function name to include in logs.
 */
export function log(evt: string, extra: Record<string, unknown> = {}, fnName?: string) {
  const logEntry: Record<string, unknown> = {
    evt,
    ts: new Date().toISOString(),
    ...extra,
  };
  if (fnName) {
    logEntry.fn = fnName;
  }
  console.log(JSON.stringify(logEntry));
}

// Define the environment variable for Graph API version
const WA_GRAPH_VERSION = Deno.env.get("WA_GRAPH_VERSION") ?? "v19.0"; // Using "v19.0" as a sensible default

/**
 * Helper to send message via WhatsApp API.
 * @param params Object containing wabaPhoneId, token, and optional idempotencyKey.
 * @param recipientPhone Recipient's E.164 phone number.
 * @param messagePayload The WhatsApp message object (e.g., { type: "text", text: { body: "..." } }).
 */
export async function callWhatsAppApi(
  params: { wabaPhoneId: string; token: string; idempotencyKey?: string },
  recipientPhone: string,
  messagePayload: Record<string, any>
): Promise<{ success: boolean; message_id?: string; error_code?: number; error_message?: string; error_details?: any }> {
    const { wabaPhoneId, token, idempotencyKey } = params;
    const apiUrl = `https://graph.facebook.com/${WA_GRAPH_VERSION}/${wabaPhoneId}/messages`; // <-- UPDATED
    const headers: HeadersInit = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    // Example of how an idempotency key *might* be used if WhatsApp supported a specific header for it.
    // WhatsApp's primary idempotency is often based on their message ID tracking.
    // This is more for illustrating if a future API or your wrapper needs it.
    if (idempotencyKey) {
        // headers['Idempotency-Key'] = idempotencyKey; // Or 'Whatsapp-Business-Request-Id' if that's a thing
        log("info_idempotency_key_usage", { idempotencyKey, wabaPhoneId }, "callWhatsAppApi");
    }

    const fullPayload = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        ...messagePayload,
    };

    log("info_whatsapp_request_shared", { apiUrl, recipient: recipientPhone, type: messagePayload.type, wabaPhoneId }, "callWhatsAppApi");
    // For debugging: console.log("Full WA Payload (shared):", JSON.stringify(fullPayload, null, 2));

    try {
        const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(fullPayload) });
        const responseData = await response.json();
        // For debugging: console.log("WA Response Data (shared):", responseData);

        if (response.ok && responseData.messages && responseData.messages[0]?.id) {
            return { success: true, message_id: responseData.messages[0].id };
        } else {
            const error = responseData.error || {};
            log("error_whatsapp_api_shared", {
                message: error.message || "Unknown WhatsApp API error",
                code: error.code || response.status,
                details: error,
                recipient: recipientPhone,
                wabaPhoneId
            }, "callWhatsAppApi");
            return {
                success: false,
                error_code: error.code || response.status,
                error_message: `${error.type ? error.type + ' - ' : ''}${error.message || 'Unknown WhatsApp API Error'}${error.error_user_title ? ' (' + error.error_user_title + ')' : ''}`,
                error_details: error
            };
        }
    } catch (e: any) {
        log("exception_whatsapp_fetch_shared", { message: e.message, stack: e.stack, recipient: recipientPhone, wabaPhoneId }, "callWhatsAppApi");
        return { success: false, error_message: e.message || "Network error or invalid JSON response", error_details: e };
    }
}