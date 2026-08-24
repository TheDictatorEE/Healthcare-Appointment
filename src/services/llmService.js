const { GoogleGenerativeAI } = require("@google/generative-ai");
const { z } = require("zod");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3.6-flash",
  generationConfig: { responseMimeType: "application/json" },
});

const PreVisitSchema = z.object({
  urgencyLevel: z.enum(["Low", "Medium", "High"]),
  chiefComplaint: z.string(),
  suggestedQuestions: z.array(z.string()).min(1),
});

const PostVisitSchema = z.object({
  summary: z.string(),
  medicationSchedule: z.array(
    z.object({
      medicine: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      durationDays: z.number(),
    })
  ),
  followUpSteps: z.array(z.string()),
});

async function generatePreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return ONLY valid JSON in this exact shape:
{
  "urgencyLevel": "Low" | "Medium" | "High",
  "chiefComplaint": "string, one sentence",
  "suggestedQuestions": ["string", "string", "string"]
}

Symptoms: ${symptoms}`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = PreVisitSchema.parse(JSON.parse(result.response.text()));
    return { success: true, data: parsed };
  } catch (err) {
    console.error("Pre-visit LLM failure:", err.message);
    // Fail-safe default: never silently downgrade urgency on failure
    return {
      success: false,
      data: {
        urgencyLevel: "Medium",
        chiefComplaint: symptoms.slice(0, 200),
        suggestedQuestions: [],
      },
      error: err.message,
    };
  }
}

async function generatePostVisitSummary(clinicalNotes) {
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps. Return ONLY valid JSON in this exact shape:
{
  "summary": "string, plain-language explanation of visit",
  "medicationSchedule": [
    { "medicine": "string", "dosage": "string", "frequency": "string", "durationDays": number }
  ],
  "followUpSteps": ["string", "string"]
}

Clinical notes: ${clinicalNotes}`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = PostVisitSchema.parse(JSON.parse(result.response.text()));
    return { success: true, data: parsed };
  } catch (err) {
    console.error("Post-visit LLM failure:", err.message);
    return {
      success: false,
      data: {
        summary:
          "Your visit summary is being processed. Please contact the clinic if you need details before it's ready.",
        medicationSchedule: [],
        followUpSteps: [],
      },
      error: err.message,
    };
  }
}

module.exports = { generatePreVisitSummary, generatePostVisitSummary };