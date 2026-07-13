/** Normalize LangChain message content (string | content parts[]) to plain text. */
export const getTextContent = (content) => {
  if (content == null) return "";
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.text) return part.text;
        if (part?.type === "text" && part?.text) return part.text;
        return "";
      })
      .join("")
      .trim();
  }
  if (typeof content === "object" && typeof content.text === "string") {
    return content.text.trim();
  }
  return String(content).trim();
};
