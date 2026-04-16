/**
 * AI Cost Advisor — Calls Claude API for independent cost opinions.
 * 
 * Sends project context (Burbank CA, prevailing wage, civic library)
 * and line item details. Returns suggested Low/Mid/High with reasoning.
 */

export async function fetchAIAdvice(item) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a senior construction cost estimator specializing in Southern California civic and institutional projects. You have 25 years of experience with prevailing wage projects in LA County.

PROJECT CONTEXT:
- Project: Burbank Central Library & Civic Center (new construction)
- Location: Burbank, CA (Los Angeles County)  
- Building: 97,500 SF gross, 4-story concrete frame
- Program: Public library + city offices + café + auditorium + parking structure
- Labor: California prevailing wage
- Delivery: Progressive Design-Build
- Construction: 2027-2029
- Design-Build Contract: $155M target
- Region: Southern California (cost index ~1.15 vs national average)

ESTIMATE THIS LINE ITEM:
- Description: ${item.description}
- Category: ${item.category}
- Subcategory: ${item.subcategory}  
- Unit of measure: ${item.unit}
- Current estimate range: $${item.unitCostLow || '?'} / $${item.unitCostMid || '?'} / $${item.unitCostHigh || '?'} per ${item.unit}
${item.basis ? `- Estimator's note: ${item.basis}` : ''}
${item.notes ? `- Additional context: ${item.notes}` : ''}

Provide your independent cost opinion. Respond ONLY with a JSON object, no markdown fences, no preamble:
{
  "low": <number - low unit cost>,
  "mid": <number - most likely unit cost>,
  "high": <number - high unit cost>,
  "confidence": "low" or "medium" or "high",
  "reasoning": "<2-3 sentences: what drives this cost in Burbank CA, prevailing wage, for a civic library>",
  "risk_up": "<one key factor that could push cost higher>",
  "risk_down": "<one key factor that could bring cost lower>",
  "market_note": "<brief note on current SoCal market conditions for this trade/item>"
}`
      }],
    }),
  });
  const data = await resp.json();
  const text = data.content.map(c => c.text || "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
