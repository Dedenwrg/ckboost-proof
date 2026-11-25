function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    return link ? <a key={index} href={link[2]}>{link[1]}</a> : part;
  });
}

export function DemoMarkdown({ text }: { text: string }) {
  // Omit static simulator counters, including from previously purchased demos.
  const readable = text.replace(/^NETWORK STATUS\s+Nodes\s+[\d,]+\s+Channels\s+[\d,]+\s+L2 Txns\s+[\d,]+\s+L1 Channel Ops\s+[\d,]+[ \t]*$/gm, '');
  return readable.trim().split(/\r?\n[ \t]*\r?\n+/).map((block, index) => {
    if (block === '---') return <hr key={index} />;
    if (block.startsWith('### ')) return <h4 key={index}>{inline(block.slice(4))}</h4>;
    if (block.startsWith('## ')) return <h3 key={index}>{inline(block.slice(3))}</h3>;
    const lines = block.split(/\r?\n/);
    if (lines.every((line) => line.startsWith('- '))) {
      return <ul key={index}>{lines.map((line, item) => <li key={item}>{inline(line.slice(2))}</li>)}</ul>;
    }
    if (lines.every((line) => /^\d+\. /.test(line))) {
      return <ol key={index}>{lines.map((line, item) => <li key={item}>{inline(line.replace(/^\d+\. /, ''))}</li>)}</ol>;
    }
    return <p key={index}>{inline(block)}</p>;
  });
}
