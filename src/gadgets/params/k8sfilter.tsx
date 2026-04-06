import K8s from '@kinvolk/headlamp-plugin/lib/k8s';
import { Box, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import React, { useEffect, useMemo, useState } from 'react';

interface K8sFilterParam {
  key: string;
  title?: string;
  valueHint?: string;
  description?: string;
}

interface K8sFilterConfig {
  get: () => string | undefined;
  set: (value: string) => void;
}

interface K8sFilterProps {
  param: K8sFilterParam;
  config: K8sFilterConfig;
  namespace: string;
  pod: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gadgetConfig: any;
}

const K8sFilterComponent: React.FC<K8sFilterProps> = ({ param, config, namespace, pod }) => {
  const kind = (param.valueHint || '').replace(/^k8s:/, '');
  const [inputValue, setInputValue] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [namespaces] = K8s.ResourceClasses.Namespace.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();

  useEffect(() => {
    console.log(kind, namespace, pod, config.get());
    if (kind === 'namespace') {
      setRawValue(namespace || '');
    } else if (kind === 'pod') {
      setRawValue(pod || '');
    } else {
      setRawValue(config.get() || '');
    }
  }, []);

  const options = useMemo(() => {
    const unique = new Set<string>();

    const add = (value?: string | null) => {
      if (!value) return;
      unique.add(value);
    };

    if (kind === 'namespace') {
      (namespaces || []).forEach(ns => {
        if (typeof ns.getName === 'function') {
          add(ns.getName());
        } else {
          add(ns?.metadata?.name);
        }
      });
    } else if (kind === 'pod') {
      (pods || []).forEach(pod => {
        if (typeof pod.getName === 'function') {
          add(pod.getName());
        } else {
          add(pod?.metadata?.name);
        }
      });
    } else if (kind === 'labels') {
      (pods || []).forEach(pod => {
        const labels = pod?.jsonData?.metadata?.labels ?? pod?.metadata?.labels;
        if (!labels) return;
        Object.entries(labels).forEach(([k, v]) => add(`${k}=${String(v)}`));
      });
    } else if (kind === 'container') {
      (pods || []).forEach(pod => {
        const containers =
          pod?.jsonData?.spec?.containers ?? pod?.spec?.containers ?? ([] as any[]);
        containers.forEach((c: any) => add(c?.name));
      });
    }

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [kind, namespaces, pods]);

  const selectedValues = useMemo(
    () =>
      rawValue
        .split(',')
        .map(v => v.trim())
        .filter(Boolean),
    [rawValue]
  );

  const handleChange = (_: any, newValues: string[], reason: string, details?: any) => {
    let finalValues = newValues;

    const trimmedInput = inputValue.trim();
    const hasNegationPrefix = trimmedInput.startsWith('!');

    // If user typed "!" and then picked an option, turning that option into "!option"
    if (reason === 'selectOption' && hasNegationPrefix && details?.option) {
      const optionLabel = String(details.option);
      const withoutOption = newValues.filter(v => v !== optionLabel);
      finalValues = [...withoutOption, `!${optionLabel}`];
    }

    if (!finalValues.length) {
      config.set('');
    } else {
      config.set(finalValues.join(','));
    }
    setRawValue(finalValues.join(','));
    // Reset input so further selections are not negated unless user types "!" again
    setInputValue('');
  };

  const placeholder =
    kind === 'namespace'
      ? 'Select namespaces...'
      : kind === 'pod'
      ? 'Select pods...'
      : kind === 'labels'
      ? 'Select labels...'
      : kind === 'container'
      ? 'Select containers...'
      : 'Select values...';

  return (
    <Box my={1}>
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={options}
        value={selectedValues}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(_, newInput) => setInputValue(newInput)}
        filterOptions={(opts, state) => {
          const raw = state.inputValue || '';
          const normalized = raw.replace(/^!+/, '').trim().toLowerCase();
          if (!normalized) return opts;
          return opts.filter(opt => opt.toLowerCase().includes(normalized));
        }}
        filterSelectedOptions
        disableCloseOnSelect
        renderInput={params => (
          <TextField
            {...params}
            label={param.title || param.key}
            placeholder={placeholder}
            helperText={`Kubernetes ${
              kind + (kind.endsWith('s') ? '' : 's')
            } to filter on. Supports ! negation.`}
          />
        )}
      />
    </Box>
  );
};

export default K8sFilterComponent;
