import type { JSONContent } from '@tiptap/core'
import { vi } from 'vitest'
import {
  createExportedDocument,
  createExportFileName,
  DocumentImportError,
  downloadExportedDocument,
  EXPORTED_DOCUMENT_KIND,
  EXPORTED_DOCUMENT_VERSION,
  parseImportedDocument,
  serializeExportedDocument,
} from './transfer'

const sampleDocument: JSONContent = {
  content: [
    {
      attrs: {
        level: 1,
      },
      content: [
        {
          text: 'Imported note',
          type: 'text',
        },
      ],
      type: 'heading',
    },
    {
      attrs: {
        formula: 'E=mc^2',
      },
      type: 'inlineMath',
    },
  ],
  type: 'doc',
}

describe('transfer', () => {
  it('creates a versioned export payload', () => {
    const exportedDocument = createExportedDocument(sampleDocument)

    expect(exportedDocument).toMatchObject({
      document: sampleDocument,
      kind: EXPORTED_DOCUMENT_KIND,
      version: EXPORTED_DOCUMENT_VERSION,
    })
    expect(exportedDocument.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('parses a valid exported document', () => {
    const text = serializeExportedDocument({
      document: sampleDocument,
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: EXPORTED_DOCUMENT_KIND,
      version: EXPORTED_DOCUMENT_VERSION,
    })

    expect(parseImportedDocument(text)).toEqual({
      document: sampleDocument,
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: EXPORTED_DOCUMENT_KIND,
      version: EXPORTED_DOCUMENT_VERSION,
    })
  })

  it('rejects malformed JSON files', () => {
    expect(() => parseImportedDocument('{invalid')).toThrowError(
      new DocumentImportError('invalid-json'),
    )
  })

  it('rejects unsupported document kinds', () => {
    expect(() =>
      parseImportedDocument(
        JSON.stringify({
          document: sampleDocument,
          exportedAt: '2026-04-08T14:30:45.000Z',
          kind: 'markdown',
          version: EXPORTED_DOCUMENT_VERSION,
        }),
      ),
    ).toThrowError(new DocumentImportError('unsupported-format'))
  })

  it('rejects unsupported document versions', () => {
    expect(() =>
      parseImportedDocument(
        JSON.stringify({
          document: sampleDocument,
          exportedAt: '2026-04-08T14:30:45.000Z',
          kind: EXPORTED_DOCUMENT_KIND,
          version: 2,
        }),
      ),
    ).toThrowError(new DocumentImportError('unsupported-version'))
  })

  it('rejects invalid editor document roots', () => {
    expect(() =>
      parseImportedDocument(
        JSON.stringify({
          document: {
            type: 'paragraph',
          },
          exportedAt: '2026-04-08T14:30:45.000Z',
          kind: EXPORTED_DOCUMENT_KIND,
          version: EXPORTED_DOCUMENT_VERSION,
        }),
      ),
    ).toThrowError(new DocumentImportError('invalid-document'))
  })

  it('builds a stable export file name from the export timestamp', () => {
    expect(createExportFileName('2026-04-08T14:30:45.000Z')).toBe(
      'markstudio-20260408-143045.json',
    )
  })

  it('downloads the serialized document as a JSON file', async () => {
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const appendSpy = vi.spyOn(document.body, 'append')
    const exportedDocument = {
      document: sampleDocument,
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: EXPORTED_DOCUMENT_KIND,
      version: EXPORTED_DOCUMENT_VERSION,
    } as const

    const fileName = downloadExportedDocument(exportedDocument)

    expect(fileName).toBe('markstudio-20260408-143045.json')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:markstudio')
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(appendSpy).toHaveBeenCalledTimes(1)

    const blob = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0]
    const downloadedBlob = blob as Blob

    expect(blob).toBeInstanceOf(Blob)
    await expect(downloadedBlob.text()).resolves.toContain('"kind": "markstudio-document"')
  })
})
