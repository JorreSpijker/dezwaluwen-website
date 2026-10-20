// Formulier voor een JSON-bestand, gegenereerd uit het zod-schema (als JSON Schema). Opslaan = commit via /api/beheer/commit.
import Form from '@rjsf/core';
import { TranslatableString, englishStringTranslator, type RJSFSchema, type UiSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import localizeNl from 'ajv-i18n/localize/nl';
import { useState } from 'react';
import { save, type SaveState } from './save';
import SaveStatus from './SaveStatus';
import './form.css';

const validator = customizeValidator({}, localizeNl);

const labels: Partial<Record<TranslatableString, string>> = {
  [TranslatableString.AddItemButton]: 'Toevoegen',
  [TranslatableString.AddButton]: 'Toevoegen',
  [TranslatableString.RemoveButton]: 'Verwijderen',
  [TranslatableString.MoveUpButton]: 'Omhoog',
  [TranslatableString.MoveDownButton]: 'Omlaag',
  [TranslatableString.CopyButton]: 'Kopiëren',
};
const translateString = (s: TranslatableString, params?: string[]) => labels[s] ?? englishStringTranslator(s, params);

type Props = { path: string; sha: string; data: unknown; schema: RJSFSchema; uiSchema?: UiSchema };

export default function JsonEditor({ path, sha: initialSha, data: initialData, schema, uiSchema }: Props) {
  const [data, setData] = useState(initialData);
  const [sha, setSha] = useState(initialSha);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  async function onSubmit(formData: unknown) {
    setState({ status: 'saving' });
    const result = await save([{ path, content: JSON.stringify(formData), sha }]);
    if (result.status === 'saved') setSha(result.data.shas[path]!);
    setState(result);
  }

  return (
    <div className="beheer-form">
      <Form
        schema={schema}
        uiSchema={{ 'ui:submitButtonOptions': { submitText: 'Opslaan' }, ...uiSchema }}
        formData={data}
        validator={validator}
        translateString={translateString}
        showErrorList="top"
        noHtml5Validate
        onChange={(e) => {
          setData(e.formData);
          if (state.status !== 'saving') setState({ status: 'idle' });
        }}
        onSubmit={(e) => onSubmit(e.formData)}
      />
      <SaveStatus state={state} />
    </div>
  );
}
