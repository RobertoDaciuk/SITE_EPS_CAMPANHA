/* Web Worker para parsing de XLSX em background (evita travar a UI)
   Mensagens esperadas:
   - { type: 'INIT', fileBuffer: ArrayBuffer }
     -> Responde: { type: 'INIT_DONE', columns: string[], previewRows: any[], totalRows: number }
   - { type: 'MAP', mapping: { codeKey: string, valueKey: string } }
     -> Emite vários: { type: 'MAP_CHUNK', items: Array<{ codigoRef: string, pontosReais: number }> }
     -> Finaliza: { type: 'MAP_DONE', totalValidos: number }
   - { type: 'CLEAR' } para limpar cache
*/

import * as XLSX from 'xlsx';

let rowsCache = [];

self.onmessage = async (event) => {
  const { type } = event.data || {};
  try {
    if (type === 'INIT') {
      const { fileBuffer } = event.data;
      if (!fileBuffer) {
        self.postMessage({ type: 'ERROR', message: 'Arquivo inválido' });
        return;
      }

      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      rowsCache = json;
      const columns = json.length > 0 ? Object.keys(json[0]) : [];
      const previewRows = json.slice(0, 5);

      self.postMessage({ type: 'INIT_DONE', columns, previewRows, totalRows: json.length });
      return;
    }

    if (type === 'MAP') {
      const { mapping } = event.data || {};
      if (!mapping || !mapping.codeKey || !mapping.valueKey) {
        self.postMessage({ type: 'ERROR', message: 'Mapeamento inválido' });
        return;
      }

      const codeKey = mapping.codeKey;
      const valueKey = mapping.valueKey;

      const CHUNK_SIZE = 2000;
      let buffer = [];
      let totalValidos = 0;

      for (let i = 0; i < rowsCache.length; i++) {
        const row = rowsCache[i];
        const codigoRef = String(row[codeKey] || '').trim();
        const rawValor = row[valueKey];
        const pontosReais = parseFloat(rawValor == null ? '0' : String(rawValor).toString().replace(',', '.'));

        if (codigoRef && Number.isFinite(pontosReais) && pontosReais !== 0) {
          buffer.push({ codigoRef, pontosReais });
          totalValidos++;
        }

        if (buffer.length >= CHUNK_SIZE) {
          self.postMessage({ type: 'MAP_CHUNK', items: buffer });
          buffer = [];
        }
      }

      if (buffer.length > 0) {
        self.postMessage({ type: 'MAP_CHUNK', items: buffer });
      }

      self.postMessage({ type: 'MAP_DONE', totalValidos });
      return;
    }

    if (type === 'CLEAR') {
      rowsCache = [];
      self.postMessage({ type: 'CLEARED' });
      return;
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', message: (err && err.message) || 'Erro desconhecido no worker' });
  }
};
