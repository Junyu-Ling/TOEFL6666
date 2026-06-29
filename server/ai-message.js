function appendTextAttachments(text, attachments = []) {
  let fullText = String(text || "").trim();
  for (const file of attachments) {
    if (file?.kind !== "text" || !file.data) continue;
    fullText += `${fullText ? "\n\n" : ""}【附件 ${file.name}】\n${file.data}`;
  }
  return fullText;
}

export function buildUserApiContent(message, { includeAttachments = true } = {}) {
  const attachments = includeAttachments ? message.attachments || [] : [];
  const images = attachments.filter((item) => item?.kind === "image" && item.data);
  const fullText = appendTextAttachments(message.content, attachments);

  if (!images.length) {
    return fullText;
  }

  const parts = [];
  const intro =
    fullText ||
    "请结合我上传的图片回答（词汇释义、题目、笔记截图等均可）。若与英语词汇学习相关，请用 Markdown 说明。";
  parts.push({ type: "text", text: intro });

  for (const image of images) {
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType || "image/jpeg"};base64,${image.data}`,
      },
    });
  }

  return parts;
}

export function normalizeChatMessagesForApi(messages) {
  const valid = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        (String(m.content || "").trim() || m.attachments?.length)
    )
    .slice(-12);

  if (!valid.length || valid[valid.length - 1].role !== "user") {
    return null;
  }

  const lastUserIndex = valid.length - 1;

  return valid.map((message, index) => {
    if (message.role === "assistant") {
      return { role: "assistant", content: String(message.content || "").trim() };
    }
    return {
      role: "user",
      content: buildUserApiContent(message, {
        includeAttachments: index === lastUserIndex,
      }),
    };
  });
}

export function toAnthropicMessageContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content || "");

  return content
    .map((part) => {
      if (part.type === "text") {
        return { type: "text", text: part.text };
      }
      if (part.type === "image_url") {
        const url = part.image_url?.url || "";
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return { type: "text", text: "[图片]" };
        return {
          type: "image",
          source: { type: "base64", media_type: match[1], data: match[2] },
        };
      }
      return null;
    })
    .filter(Boolean);
}
