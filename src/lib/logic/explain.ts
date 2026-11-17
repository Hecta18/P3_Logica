import {
  domainLatex,
  functionLatex,
  predicateLatex,
  setLatex,
  textLatex,
  tupleLatex,
  variableLatex
} from './latex';
import { generateTuples, tupleFromKey, tupleKey } from './tuples';
import { certificateOfTrace, traceReason } from './evaluate';
import type {
  Certificate,
  Structure,
  Trace,
  TraceRow
} from './types';

function addTraceRows(trace: Trace, depth: number, rows: TraceRow[]): void {
  rows.push({
    depth,
    kind: 'trace',
    formulaLatex: trace.formulaLatex,
    value: trace.value,
    reason: traceReason(trace),
    detailLatex:
      trace.kind === 'atom' || trace.kind === 'equality' ? trace.detailLatex : undefined
  });

  if (trace.kind === 'not') {
    addTraceRows(trace.child, depth + 1, rows);
    return;
  }

  if (trace.kind === 'and' || trace.kind === 'or' || trace.kind === 'implies') {
    addTraceRows(trace.left, depth + 1, rows);
    if (trace.rightEvaluated && trace.right) {
      addTraceRows(trace.right, depth + 1, rows);
    }
    return;
  }

  if (trace.kind === 'forall' || trace.kind === 'exists') {
    const certificate = certificateTitle(trace.certificate);
    const decisiveEntry = trace.entries[0];
    const detail =
      trace.certificate === 'complete'
        ? undefined
        : decisiveEntry
          ? `${variableLatex(trace.variable)} = ${textLatex(decisiveEntry.element)}`
          : undefined;

    rows.push({
      depth: depth + 1,
      kind: 'certificate',
      certificate: trace.certificate,
      label:
        trace.certificate === 'complete'
          ? `${certificate} (${trace.entries.length} ${trace.entries.length === 1 ? 'elemento' : 'elementos'})`
          : certificate,
      detailLatex: detail
    });

    for (const entry of trace.entries) {
      rows.push({
        depth: depth + 1,
        kind: 'binding',
        bindingVariable: trace.variable,
        bindingElement: entry.element
      });
      addTraceRows(entry.body, depth + 2, rows);
    }
  }
}

export function flattenTrace(trace: Trace): TraceRow[] {
  const rows: TraceRow[] = [];
  addTraceRows(trace, 0, rows);
  return rows;
}

export function certificateTitle(certificate: Certificate): string {
  switch (certificate) {
    case 'witness':
      return 'Testigo';
    case 'counterexample':
      return 'Contraejemplo';
    case 'complete':
      return 'Comprobación completa';
    case 'direct':
      return 'Evaluación directa';
  }
}

export interface CertificateSummary {
  certificate: Certificate;
  label: string;
  detailLatex?: string;
  detailText?: string;
}

export function certificateSummary(trace: Trace): CertificateSummary {
  const certificate = certificateOfTrace(trace);
  const label = certificateTitle(certificate);

  if (trace.kind === 'forall' || trace.kind === 'exists') {
    if (trace.certificate === 'complete') {
      return {
        certificate,
        label,
        detailText: `Se revisaron ${trace.entries.length} ${trace.entries.length === 1 ? 'elemento' : 'elementos'} del dominio.`
      };
    }
    const entry = trace.entries[0];
    if (entry) {
      return {
        certificate,
        label,
        detailLatex: `${variableLatex(trace.variable)} = ${textLatex(entry.element)}`
      };
    }
  }

  return {
    certificate,
    label,
    detailText:
      certificate === 'direct'
        ? 'La verdad de la fórmula se obtuvo evaluando sus componentes.'
        : undefined
  };
}

export interface StructureLatexSummary {
  domainLatex: string;
  functions: Array<{ name: string; latex: string }>;
  predicates: Array<{ name: string; latex: string }>;
}

export function structureLatexSummary(structure: Structure): StructureLatexSummary {
  const functions = Object.entries(structure.functions).map(([name, interpretation]) => {
    const rows = generateTuples(structure.domain, interpretation.arity).map((tuple) => {
      const value = interpretation.values[tupleKey(tuple)];
      return `${functionLatex(name)}^{I}${tupleLatex(tuple)} = ${textLatex(value ?? '?')}`;
    });
    return {
      name,
      latex: rows.join(',\\quad ')
    };
  });

  const predicates = Object.entries(structure.predicates).map(([name, interpretation]) => {
    const tuples = Object.keys(interpretation.trueTuples)
      .map((key) => tupleFromKey(key))
      .filter((tuple): tuple is string[] => tuple !== null);
    return {
      name,
      latex: `${predicateLatex(name)}^{I} = ${setLatex(tuples)}`
    };
  });

  return {
    domainLatex: domainLatex(structure.domain),
    functions,
    predicates
  };
}
