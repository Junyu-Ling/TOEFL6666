import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { prepareAiMarkdown } from "../utils/normalizeMarkdown";

export default function RichAiContent({ content }) {
  if (!content?.trim()) return null;

  const markdown = prepareAiMarkdown(content);

  return (
    <div className="rich-ai-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table: ({ children, ...props }) => (
            <div className="rich-ai-content__table-wrap">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
