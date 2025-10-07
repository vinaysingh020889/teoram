export default function AIContent({ type, body }: { type?: string; body?: string }) {
  if (!body) return null;
  return <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: body }} />;
}