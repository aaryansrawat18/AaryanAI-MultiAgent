import axios from "axios";
import { getModel } from "../utils/model.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getTextContent } from "../utils/getTextContent.js";

export const imageAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "image");
    await deductCredits(state.userId, "image");

    const llm = getModel("image");

    const promptResponse = await llm.invoke(`
You are an elite AI image prompt engineer.

Convert the user request into a highly detailed image generation prompt.

Requirements:

- Cinematic lighting
- Professional composition
- Ultra realistic
- High detail
- Beautiful color palette
- Sharp focus
- 8K quality
- Photorealistic
- Depth of field
- Professional photography
- Stunning visuals

Return only the image prompt.

User Request:

${state.prompt}
`);

    const enhancedPrompt =
      getTextContent(promptResponse?.content) || state.prompt;

    const imageUrl =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(
        enhancedPrompt
      )}?width=1024&height=1024&model=flux&nologo=true&seed=${Date.now()}`;

    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 90000,
      headers: {
        Accept: "image/*",
        "User-Agent": "AaryanAI/1.0",
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentType = String(
      imageResponse.headers["content-type"] || ""
    );

    if (!contentType.startsWith("image/")) {
      throw new Error(
        "Image provider returned a non-image response. Please try again."
      );
    }

    const imageBuffer = Buffer.from(imageResponse.data);

    if (imageBuffer.length < 1000) {
      throw new Error("Generated image was empty or too small.");
    }

    const fileName = `image-${Date.now()}.png`;

    const downloadUrl = await uploadToS3(
      imageBuffer,
      fileName,
      contentType.includes("jpeg") ? "image/jpeg" : "image/png"
    );

    return {
      ...state,
      response: `
# 🖼️ Image Generated Successfully

![Generated Image](${downloadUrl})

📥 [Download Image](${downloadUrl})
`.trim(),
      images: [downloadUrl],
    };
  } catch (error) {
    console.log("Image Agent Error:", error);

    if (error?.status) {
      throw error;
    }

    return {
      ...state,
      response: `❌ Failed to generate image.${
        error?.message ? ` (${error.message})` : ""
      }`,
    };
  }
};
