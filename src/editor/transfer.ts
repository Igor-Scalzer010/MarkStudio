import type { JSONContent } from '@tiptap/core'
import { isDocumentContent } from './storage'

export const EXPORTED_DOCUMENT_KIND = 'markstudio-document'
export const EXPORTED_DOCUMENT_VERSION = 1
const EXPORT_FILE_EXTENSION = '.json'

export type ExportedDocumentV1 = {
  document: JSONContent
  exportedAt: string
  kind: typeof EXPORTED_DOCUMENT_KIND
  version: typeof EXPORTED_DOCUMENT_VERSION
}

export type ImportErrorCode =
  | 'invalid-json'
  | 'invalid-document'
  | 'unsupported-format'
  | 'unsupported-version'

export class DocumentImportError extends Error {
  code: ImportErrorCode

  constructor(code: ImportErrorCode) {
    super(code)
    this.code = code
    this.name = 'DocumentImportError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

const isSupportedVersion = (value: unknown): value is typeof EXPORTED_DOCUMENT_VERSION =>
  value === EXPORTED_DOCUMENT_VERSION

const padFileNamePart = (value: number): string => value.toString().padStart(2, '0')

// Keep the external contract explicit so imports can reject unknown versions safely.
export const createExportedDocument = (document: JSONContent): ExportedDocumentV1 => ({
  document,
  exportedAt: new Date().toISOString(),
  kind: EXPORTED_DOCUMENT_KIND,
  version: EXPORTED_DOCUMENT_VERSION,
})

export const isExportedDocument = (value: unknown): value is ExportedDocumentV1 => {
  if (!isRecord(value)) {
    return false
  }

  if (value.kind !== EXPORTED_DOCUMENT_KIND) {
    return false
  }

  if (!isSupportedVersion(value.version)) {
    return false
  }

  if (typeof value.exportedAt !== 'string') {
    return false
  }

  return isDocumentContent(value.document)
}

// Import always validates the MarkStudio envelope before the editor state is replaced.
export const parseImportedDocument = (text: string): ExportedDocumentV1 => {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(text) as unknown
  } catch {
    throw new DocumentImportError('invalid-json')
  }

  if (!isRecord(parsedValue)) {
    throw new DocumentImportError('unsupported-format')
  }

  if (parsedValue.kind !== EXPORTED_DOCUMENT_KIND) {
    throw new DocumentImportError('unsupported-format')
  }

  if (!isSupportedVersion(parsedValue.version)) {
    throw new DocumentImportError('unsupported-version')
  }

  if (!isDocumentContent(parsedValue.document)) {
    throw new DocumentImportError('invalid-document')
  }

  if (typeof parsedValue.exportedAt !== 'string') {
    throw new DocumentImportError('unsupported-format')
  }

  return parsedValue as ExportedDocumentV1
}

export const serializeExportedDocument = (document: ExportedDocumentV1): string =>
  JSON.stringify(document, null, 2)

// File names use the export timestamp so repeated downloads stay easy to sort locally.
export const createExportFileName = (exportedAt: string): string => {
  const parsedDate = new Date(exportedAt)
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
  const year = date.getUTCFullYear()
  const month = padFileNamePart(date.getUTCMonth() + 1)
  const day = padFileNamePart(date.getUTCDate())
  const hours = padFileNamePart(date.getUTCHours())
  const minutes = padFileNamePart(date.getUTCMinutes())
  const seconds = padFileNamePart(date.getUTCSeconds())

  return `markstudio-${year}${month}${day}-${hours}${minutes}${seconds}${EXPORT_FILE_EXTENSION}`
}

// The browser download stays in this module so the App only coordinates user intent.
export const downloadExportedDocument = (document: ExportedDocumentV1): string => {
  const serializedDocument = serializeExportedDocument(document)
  const fileName = createExportFileName(document.exportedAt)
  const blob = new Blob([serializedDocument], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName
  anchor.style.display = 'none'
  window.document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)

  return fileName
}
