import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function checkModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent("hello");
        console.log("Success with gemini-flash-latest!", result.response.text());
    } catch (e) {
        console.log("Error:", e.message);
    }
}
checkModels();
