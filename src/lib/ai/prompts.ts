import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-api-key',
});

// TYPES FOR STRUCTURED OUTPUTS
export interface IntentClassification {
    intent: 'NEW_LEAD' | 'VISUAL_ESTIMATE' | 'STATUS_UPDATE' | 'COMPLAINT' | 'GENERAL_FAQ';
    confidence_score: number;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface VisualEstimate {
    identified_subject: string;
    condition_severity: 'LIGHT' | 'MODERATE' | 'SEVERE';
    estimated_bracket_low: number;
    estimated_bracket_high: number;
    customer_message_draft: string;
}

export interface LeadCaptureData {
    customer_name: string;
    property_address: string;
    service_requested: string;
    project_notes: string;
}

/**
 * Prompt 1: The Master Router (Intent Classification)
 */
export async function masterRouterPrompt(
    userMessage: string,
    businessName: string,
    industryType: string,
    hasImage: boolean
): Promise<IntentClassification | null> {
    const prompt = `
    You are the central routing intelligence for ${businessName}, a local ${industryType} company. 
    Your ONLY job is to analyze the user's message and output a strict JSON response categorizing their intent.

    Categories:
    1. "NEW_LEAD": The user is asking for a quote, pricing, or wants to book a service.
    2. "VISUAL_ESTIMATE": The user has attached an image of their property/issue.
    3. "STATUS_UPDATE": The user is asking about an existing appointment or job status.
    4. "COMPLAINT": The user is unhappy or reporting an issue with recent work.
    5. "GENERAL_FAQ": The user is asking a basic question (e.g., "Are you insured?", "What are your hours?").

    Has Image Attachment: ${hasImage ? 'True' : 'False'}
    User Message: "${userMessage}"
  `;

    const schema = {
        type: "object",
        properties: {
            intent: { type: "string", enum: ["NEW_LEAD", "VISUAL_ESTIMATE", "STATUS_UPDATE", "COMPLAINT", "GENERAL_FAQ"] },
            confidence_score: { type: "integer", description: "0-100" },
            urgency: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] }
        },
        required: ["intent", "confidence_score", "urgency"]
    };

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            tools: [{
                type: "function",
                function: {
                    name: "classify_intent",
                    description: "Categorize the user's SMS intent.",
                    parameters: schema as any
                }
            }],
            tool_choice: { type: "function", function: { name: "classify_intent" } }
        });

        const toolCall = response.choices[0].message.tool_calls?.[0];
        if (toolCall) {
            return JSON.parse((toolCall as any).function.arguments) as IntentClassification;
        }
        return null;
    } catch (error) {
        console.error('Master Router Error:', error);
        return null;
    }
}

/**
 * Prompt 2: Inbound Lead Qualification (The Closer)
 */
export async function triggerLeadQualificationFlow(
    conversationHistory: string,
    latestMessage: string,
    businessData: any
) {
    const prompt = `
    You are the virtual receptionist for ${businessData.name}. You are speaking to a potential customer via SMS. 
    Your Goal: Gather the required information to provide an accurate estimate or book an on-site inspection, while being warm, highly professional, and concise.
    
    Required Information to Gather:
    1. Full Name
    2. Property Address
    3. Specific service requested
    
    Context / Knowledge Base (RAG Data):
    Services Offered: ${businessData.servicesOffered}
    Base Pricing: ${businessData.basePricing}
    
    Rules:
    - Keep text messages under 3 sentences.
    - Ask ONE question at a time.
    - NEVER invent pricing.

    Conversation History:
    ${conversationHistory}
    
    User: ${latestMessage}
  `;

    const schema = {
        type: "object",
        properties: {
            customer_name: { type: "string" },
            property_address: { type: "string" },
            service_requested: { type: "string" },
            project_notes: { type: "string" }
        },
        required: ["customer_name", "property_address", "service_requested"]
    };

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: prompt }],
            tools: [{
                type: "function",
                function: {
                    name: "create_new_lead",
                    description: "Call this function ONLY when you have gathered the user's name, address, and requested service.",
                    parameters: schema as any
                }
            }],
            tool_choice: "auto"
        });

        return response.choices[0].message;
    } catch (error) {
        console.error('Closer Prompt Error:', error);
    }
}

/**
 * Prompt 3: AI Visual Estimator (Vision API)
 */
export async function triggerVisualEstimateFlow(
    imageUrl: string,
    businessData: any
): Promise<VisualEstimate | null> {
    const prompt = `
    You are an expert estimator for ${businessData.name}. 
    Analyze the image and provide a preliminary, non-binding assessment.

    Instructions:
    1. Identify the core subject (e.g., roof, driveway, pool).
    2. Note condition severity.
    3. Provide a rough estimate bracket.
    4. Draft a friendly text message response to the customer.
  `;

    const schema = {
        type: "object",
        properties: {
            identified_subject: { type: "string" },
            condition_severity: { type: "string", enum: ["LIGHT", "MODERATE", "SEVERE"] },
            estimated_bracket_low: { type: "integer" },
            estimated_bracket_high: { type: "integer" },
            customer_message_draft: { type: "string" }
        },
        required: ["identified_subject", "condition_severity", "customer_message_draft"]
    };

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                }
            ],
            tools: [{
                type: "function",
                function: {
                    name: "generate_visual_estimate",
                    description: "Log the estimated property condition and quote bracket.",
                    parameters: schema as any
                }
            }],
            tool_choice: { type: "function", function: { name: "generate_visual_estimate" } }
        });

        const toolCall = response.choices[0].message.tool_calls?.[0];
        if (toolCall) {
            return JSON.parse((toolCall as any).function.arguments) as VisualEstimate;
        }
        return null;
    } catch (error) {
        console.error('Vision API Error:', error);
        return null;
    }
}
