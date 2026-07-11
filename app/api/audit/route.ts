import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is not configured on the server. Please set GEMINI_API_KEY in your environment.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fileData, mimeType, policies } = body;

    if (!fileData || !mimeType) {
      return NextResponse.json(
        { error: 'Missing file data or mime type.' },
        { status: 400 }
      );
    }

    // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,")
    let rawBase64 = fileData;
    if (fileData.includes(';base64,')) {
      rawBase64 = fileData.split(';base64,')[1];
    }

    // Format policies text for prompt context
    const policiesListText = policies && Array.isArray(policies)
      ? policies
          .filter((p: any) => p.enabled)
          .map((p: any) => `- [${p.id}]: ${p.name}. Requirement: ${p.description}`)
          .join('\n')
      : 'No specific policy rules enabled. Flag standard invoice irregularities only.';

    const systemPrompt = `You are "Paper Trail AI", an advanced, precise fintech audit agent for small businesses.
Your objective is to extract all receipt/invoice details and audit them against the company's active expense policies.

### Company Expense Policies:
${policiesListText}

### Audit Instructions:
1. Extract general invoice metadata (Vendor, Date, Invoice Number, Total Amount, Currency, Category).
2. Extract each individual line item in the invoice (Description, Quantity, Unit Price, Total Price).
3. Evaluate the entire invoice and every line item against the Active Company Expense Policies:
   - For EACH policy rule, determine if the invoice violates it.
   - If a rule is violated, flag it as an anomaly.
   - Assign a severity score:
     * "HIGH": Direct, severe violation (e.g. unauthorized cash withdrawal, explicit banned items like alcohol, or exceeding spending limit by > 50%).
     * "MEDIUM": Standard violation (e.g. over-budget meal, missing required details, invoice dated > 90 days ago).
     * "LOW": Warnings or minor discrepancies (e.g. tip exceeding 20%, ambiguous line item descriptions).
4. Set "isCompliant" to false if there is ANY violation with MEDIUM or HIGH severity. Otherwise, it is true.
5. Provide a clear, detailed summary "reason" explaining why the invoice passed or failed the audit.

You must respond with raw JSON that strictly adheres to the requested schema. Ensure all fields are filled accurately and dates are in standard YYYY-MM-DD format if readable.`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: rawBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            invoiceNumber: { type: 'STRING' },
            vendor: { type: 'STRING' },
            date: { type: 'STRING' },
            totalAmount: { type: 'NUMBER' },
            currency: { type: 'STRING' },
            lineItems: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  description: { type: 'STRING' },
                  quantity: { type: 'NUMBER' },
                  unitPrice: { type: 'NUMBER' },
                  totalPrice: { type: 'NUMBER' }
                },
                required: ['description', 'totalPrice']
              }
            },
            category: { type: 'STRING' },
            complianceCheck: {
              type: 'OBJECT',
              properties: {
                isCompliant: { type: 'BOOLEAN' },
                reason: { type: 'STRING' },
                flaggedAnomalies: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      anomalyType: { type: 'STRING' },
                      ruleViolated: { type: 'STRING' },
                      severity: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                      description: { type: 'STRING' }
                    },
                    required: ['anomalyType', 'ruleViolated', 'severity', 'description']
                  }
                }
              },
              required: ['isCompliant', 'reason', 'flaggedAnomalies']
            }
          },
          required: ['vendor', 'date', 'totalAmount', 'lineItems', 'category', 'complianceCheck']
        }
      }
    };

    const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash'];
    let lastErrorDetails = '';
    let lastStatus = 500;
    let lastStatusText = 'Internal Server Error';
    let responseData: any = null;

    for (const model of modelsToTry) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      let attempts = 0;
      const maxAttempts = 3;
      let delay = 1000;
      let success = false;

      console.log(`[Audit API] Attempting audit with model: ${model}`);

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiPayload)
          });

          if (response.ok) {
            responseData = await response.json();
            success = true;
            console.log(`[Audit API] Successful audit with model: ${model}`);
            break;
          }

          lastStatus = response.status;
          lastStatusText = response.statusText;
          lastErrorDetails = await response.text();

          console.warn(`[Audit API] Model ${model} returned error status: ${response.status} (${response.statusText}).`);

          // If the error is 503 (Service Unavailable) or 429 (Rate Limit/Quota), retry with delay
          if (response.status === 503 || response.status === 429) {
            if (attempts < maxAttempts) {
              console.warn(`[Audit API] Retrying model ${model} in ${delay}ms... (Attempt ${attempts}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2; // exponential backoff
              continue;
            }
          }

          // For other errors (like 404 Not Found), break immediately to try the next model
          break;

        } catch (fetchError: any) {
          lastErrorDetails = fetchError.message || String(fetchError);
          lastStatus = 500;
          lastStatusText = 'Fetch Error';
          console.error(`[Audit API] Network error during fetch with model ${model}:`, fetchError);
          
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        }
      }

      if (success) {
        break;
      }
      
      console.warn(`[Audit API] Model ${model} failed. Trying next model if available...`);
    }

    if (!responseData) {
      return NextResponse.json(
        { error: `Gemini API returned an error: ${lastStatusText}`, details: lastErrorDetails },
        { status: lastStatus }
      );
    }
    
    // Parse the generated text from Gemini as JSON
    const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return NextResponse.json(
        { error: 'Gemini API failed to generate a response.' },
        { status: 500 }
      );
    }

    try {
      const parsedAudit = JSON.parse(textResult);
      return NextResponse.json(parsedAudit);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Failed to parse Gemini output as JSON.', rawText: textResult },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Audit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during invoice audit.', details: error.message || String(error) },
      { status: 500 }
    );
  }
}
