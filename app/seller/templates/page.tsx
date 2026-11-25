import { readArticleTemplates } from '../../../lib/read-article-templates';
import { TemplatePicker } from './TemplatePicker';

export default function TemplatesPage() {
  return <TemplatePicker templates={readArticleTemplates()} />;
}
