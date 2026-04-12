import type { ChangeEvent, CSSProperties } from 'react'
import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import 'katex/dist/katex.min.css'
import './App.css'
import { FloatingToolbar } from './components/FloatingToolbar'
import { SelectionBubbleMenu } from './components/SelectionBubbleMenu'
import { BlockMath, InlineMath } from './editor/extensions/math'
import {
  createEmptyDocument,
  readStoredEditorContent,
  readStoredTheme,
  writeEditorContent,
  writeTheme,
  type Theme,
} from './editor/storage'
import {
  createExportedDocument,
  DocumentImportError,
  downloadExportedDocument,
  parseImportedDocument,
} from './editor/transfer'
import {
  resolveToolbarClearance,
  resolveViewportScrollDelta,
} from './editor/toolbarViewport'

type PromptKind = 'help' | 'image' | 'link' | 'math'

type LinkDraft = {
  label: string
  url: string
}

type ImageDraft = {
  alt: string
  url: string
}

type MathDraft = {
  displayMode: 'block' | 'inline'
  formula: string
}

type TransferStatus = {
  message: string
  tone: 'error' | 'info' | 'success'
}

// Transfer feedback should confirm the action without staying sticky in the chrome.
const TRANSFER_STATUS_VISIBLE_MS = 3500

// Keep the initial Tiptap payload stable across rerenders so the editor does not
// reset itself after the first mount.
const createInitialContent = (): JSONContent =>
  readStoredEditorContent() ?? createEmptyDocument()

const getInitialTheme = (): Theme => {
  const storedTheme = readStoredTheme()

  if (storedTheme) {
    return storedTheme
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const isEditableShortcutTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return target.closest('input, textarea, select') !== null
}

const SunIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4.25" />
    <path d="M12 2.75v2.5" />
    <path d="M12 18.75v2.5" />
    <path d="m5.45 5.45 1.75 1.75" />
    <path d="m16.8 16.8 1.75 1.75" />
    <path d="M2.75 12h2.5" />
    <path d="M18.75 12h2.5" />
    <path d="m5.45 18.55 1.75-1.75" />
    <path d="m16.8 7.2 1.75-1.75" />
  </svg>
)

const MoonIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M19.25 13.15A7.75 7.75 0 1 1 10.85 4.75a6.3 6.3 0 0 0 8.4 8.4Z" />
  </svg>
)

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [activePrompt, setActivePrompt] = useState<PromptKind | null>(null)
  const [transferStatus, setTransferStatus] = useState<TransferStatus | null>(null)
  const [linkDraft, setLinkDraft] = useState<LinkDraft>({ label: '', url: '' })
  const [imageDraft, setImageDraft] = useState<ImageDraft>({ alt: '', url: '' })
  const [mathDraft, setMathDraft] = useState<MathDraft>({
    displayMode: 'inline',
    formula: '',
  })
  const editorAreaRef = useRef<HTMLElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const toolbarShellRef = useRef<HTMLDivElement | null>(null)
  const [toolbarClearance, setToolbarClearance] = useState(160)
  // The initial document only needs to be read once, before Tiptap mounts.
  const initialContent = useMemo(() => createInitialContent(), [])

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: {
          levels: [1, 2, 3],
        },
        horizontalRule: false,
        link: {
          autolink: true,
          defaultProtocol: 'https',
          openOnClick: false,
        },
        strike: false,
      }),
      Placeholder.configure({
        emptyEditorClass: 'is-editor-empty',
        placeholder: 'Write with clarity. The formatting keeps up with you.',
      }),
      Image.configure({
        allowBase64: false,
        inline: false,
      }),
      InlineMath,
      BlockMath,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        'aria-label': 'Live editor',
        'data-testid': 'editor-content',
        class: 'markstudio-editor',
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      writeEditorContent(activeEditor.getJSON())
    },
  })

  const closePrompt = (): void => {
    setActivePrompt(null)
  }

  const openLinkPrompt = (): void => {
    if (!editor) {
      return
    }

    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      ' ',
    )

    setLinkDraft({
      label: selectedText.trim(),
      url: String(editor.getAttributes('link').href ?? ''),
    })
    setActivePrompt('link')
  }

  const openImagePrompt = (): void => {
    setImageDraft({ alt: '', url: '' })
    setActivePrompt('image')
  }

  const openMathPrompt = (): void => {
    setMathDraft({
      displayMode: editor?.isActive('blockMath') ? 'block' : 'inline',
      formula: '',
    })
    setActivePrompt('math')
  }

  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!editor || !editorAreaRef.current) {
      return
    }

    if (event.key === 'Escape' && activePrompt) {
      event.preventDefault()
      closePrompt()
      editor.chain().focus().run()
      return
    }

    const target = event.target
    const editorHasFocus =
      editor.isFocused || editorAreaRef.current.contains(document.activeElement)
    const interactingWithPromptInput =
      isEditableShortcutTarget(target) && !editorAreaRef.current.contains(target as Node)

    if (!editorHasFocus || interactingWithPromptInput) {
      return
    }

    const key = event.key.toLowerCase()
    const hasModifier = event.ctrlKey || event.metaKey

    if (!hasModifier) {
      return
    }

    if (key === 'h' || (event.shiftKey && key === 'k')) {
      event.preventDefault()
      openLinkPrompt()
      return
    }

    if (key === 'm') {
      event.preventDefault()
      openMathPrompt()
      return
    }

    if (key === '/' && !event.shiftKey) {
      event.preventDefault()
      setActivePrompt('help')
      return
    }

    if (event.altKey && ['1', '2', '3'].includes(key)) {
      event.preventDefault()
      editor.chain().focus().toggleHeading({ level: Number(key) as 1 | 2 | 3 }).run()
      return
    }

    if (event.shiftKey && key === '7') {
      event.preventDefault()
      editor.chain().focus().toggleOrderedList().run()
      return
    }

    if (event.shiftKey && key === '8') {
      event.preventDefault()
      editor.chain().focus().toggleBulletList().run()
      return
    }

    if (event.shiftKey && key === 'i') {
      event.preventDefault()
      openImagePrompt()
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut, { capture: true })

    return () => {
      window.removeEventListener('keydown', handleShortcut, { capture: true })
    }
  }, [])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    writeTheme(theme)
  }, [theme])

  // Import/export feedback is intentionally temporary so the chrome returns to
  // its resting state after each file action.
  useEffect(() => {
    if (!transferStatus) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setTransferStatus(null)
    }, TRANSFER_STATUS_VISIBLE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [transferStatus])

  // The floating toolbar sits above the writing surface, so we nudge the
  // viewport only when the caret drifts into that occupied zone.
  const syncViewportWithSelection = useEffectEvent(() => {
    const toolbarShell = toolbarShellRef.current

    if (!toolbarShell) {
      return
    }

    const toolbarRect = toolbarShell.getBoundingClientRect()
    const nextClearance = resolveToolbarClearance(toolbarRect.height)

    setToolbarClearance((currentClearance) =>
      currentClearance === nextClearance ? currentClearance : nextClearance,
    )

    if (!editor?.isFocused) {
      return
    }

    let selectionBottom: number | null = null

    try {
      selectionBottom = editor.view.coordsAtPos(editor.state.selection.to).bottom
    } catch {
      selectionBottom = null
    }

    const scrollDelta = resolveViewportScrollDelta({
      editorFocused: editor.isFocused,
      selectionBottom,
      toolbarTop: toolbarRect.top,
    })

    if (scrollDelta > 0) {
      window.scrollBy(0, scrollDelta)
    }
  })

  useEffect(() => {
    let frameId = 0

    const scheduleViewportSync = (): void => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        syncViewportWithSelection()
      })
    }

    scheduleViewportSync()
    window.addEventListener('resize', scheduleViewportSync)

    const resizeObserver =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(() => {
            scheduleViewportSync()
          })
        : null

    if (toolbarShellRef.current && resizeObserver) {
      resizeObserver.observe(toolbarShellRef.current)
    }

    if (editor) {
      editor.on('selectionUpdate', scheduleViewportSync)
      editor.on('update', scheduleViewportSync)
      editor.on('focus', scheduleViewportSync)
    }

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', scheduleViewportSync)
      resizeObserver?.disconnect()

      if (editor) {
        editor.off('selectionUpdate', scheduleViewportSync)
        editor.off('update', scheduleViewportSync)
        editor.off('focus', scheduleViewportSync)
      }
    }
  }, [activePrompt, editor])

  const toggleTheme = (): void => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
  }

  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const themeButtonLabel = `Switch to ${nextTheme} theme`

  const focusEditor = (): void => {
    editor?.chain().focus().run()
  }

  const toggleBlockquote = (): void => {
    editor?.chain().focus().toggleBlockquote().run()
  }

  const appShellStyle = {
    '--toolbar-clearance': `${toolbarClearance}px`,
  } as CSSProperties

  const openImportPicker = (): void => {
    importInputRef.current?.click()
  }

  // Export always uses the current editor JSON so the downloaded file can be
  // imported back without lossy Markdown conversion.
  const exportDocument = (): void => {
    if (!editor) {
      setTransferStatus({
        message: 'The editor is still loading. Try exporting again in a moment.',
        tone: 'error',
      })
      return
    }

    try {
      const fileName = downloadExportedDocument(createExportedDocument(editor.getJSON()))

      setTransferStatus({
        message: `Document exported as ${fileName}`,
        tone: 'success',
      })
    } catch {
      setTransferStatus({
        message: 'Export failed. Try again.',
        tone: 'error',
      })
    }
  }

  // Map parser-level failures to short UI feedback instead of leaking internal
  // validation codes into the editor chrome.
  const getImportErrorMessage = (error: unknown): string => {
    if (!(error instanceof DocumentImportError)) {
      return 'Import failed. Try another file.'
    }

    switch (error.code) {
      case 'invalid-json':
        return 'The selected file is not valid JSON.'
      case 'unsupported-version':
        return 'This document version is not supported yet.'
      case 'invalid-document':
        return 'The selected file does not contain a valid MarkStudio document.'
      case 'unsupported-format':
      default:
        return 'The selected file is not a MarkStudio document.'
    }
  }

  // Import replaces the in-memory editor content and immediately persists the
  // restored document so the local draft stays in sync with the loaded file.
  const importDocument = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const importedDocument = parseImportedDocument(await file.text())
      const shouldReplace = window.confirm(
        'Importing will replace the current document. Continue?',
      )

      if (!shouldReplace) {
        setTransferStatus({
          message: 'Import canceled.',
          tone: 'info',
        })
        return
      }

      if (!editor) {
        setTransferStatus({
          message: 'The editor is still loading. Try importing again in a moment.',
          tone: 'error',
        })
        return
      }

      editor.commands.setContent(importedDocument.document)
      writeEditorContent(importedDocument.document)
      setTransferStatus({
        message: 'Document imported.',
        tone: 'success',
      })
    } catch (error) {
      setTransferStatus({
        message: getImportErrorMessage(error),
        tone: 'error',
      })
    } finally {
      event.target.value = ''
    }
  }

  const applyLink = (): void => {
    if (!editor) {
      return
    }

    const url = linkDraft.url.trim()
    const label = linkDraft.label.trim()

    if (!url) {
      return
    }

    if (editor.state.selection.empty) {
      const text = label || url

      editor
        .chain()
        .focus()
        .insertContent({
          marks: [
            {
              attrs: { href: url },
              type: 'link',
            },
          ],
          text,
          type: 'text',
        })
        .run()
    } else if (label) {
      editor
        .chain()
        .focus()
        .insertContent({
          marks: [
            {
              attrs: { href: url },
              type: 'link',
            },
          ],
          text: label,
          type: 'text',
        })
        .run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    closePrompt()
  }

  const applyImage = (): void => {
    if (!editor) {
      return
    }

    const url = imageDraft.url.trim()
    const alt = imageDraft.alt.trim()

    if (!url) {
      return
    }

    try {
      new URL(url)
    } catch {
      return
    }

    editor.chain().focus().setImage({ alt, src: url }).run()
    closePrompt()
  }

  const applyMath = (): void => {
    if (!editor) {
      return
    }

    const formula = mathDraft.formula.trim()

    if (!formula) {
      return
    }

    if (mathDraft.displayMode === 'block') {
      editor.chain().focus().setBlockMath({ formula }).run()
    } else {
      editor.chain().focus().setInlineMath({ formula }).run()
    }

    closePrompt()
  }

  return (
    <main className="app-shell" style={appShellStyle}>
      <section className="editor-layout">
        <header className="editor-chrome">
          <div className="editor-mark">
            <span className="editor-mark__eyebrow">MarkStudio</span>
          </div>
          <div className="editor-tools-wrap">
            <div className="editor-tools">
              <input
                accept=".json,application/json"
                aria-label="Import MarkStudio document"
                data-testid="import-document-input"
                hidden
                onChange={importDocument}
                ref={importInputRef}
                type="file"
              />
              <button
                aria-label="Import document"
                className="editor-action"
                onClick={openImportPicker}
                title="Import document"
                type="button"
              >
                Import
              </button>
              <button
                aria-label="Export document"
                className="editor-action"
                onClick={exportDocument}
                title="Export document"
                type="button"
              >
                Export
              </button>
              <button
                aria-label={themeButtonLabel}
                className="theme-toggle"
                onClick={toggleTheme}
                title={themeButtonLabel}
                type="button"
              >
                <span className="theme-toggle__icon">
                  {theme === 'light' ? <SunIcon /> : <MoonIcon />}
                </span>
              </button>
            </div>
            {transferStatus ? (
              <p
                className={`editor-status editor-status--${transferStatus.tone}`}
                role={transferStatus.tone === 'error' ? 'alert' : 'status'}
              >
                {transferStatus.message}
              </p>
            ) : null}
          </div>
        </header>

        <section className="editor-column" ref={editorAreaRef}>
          {editor ? (
            <>
              <SelectionBubbleMenu
                editor={editor}
                isPromptOpen={activePrompt !== null}
                onToggleBlockquote={toggleBlockquote}
              />
              <EditorContent editor={editor} />
            </>
          ) : null}
        </section>
      </section>

      <FloatingToolbar
        activePrompt={activePrompt}
        editor={editor}
        imageDraft={imageDraft}
        linkDraft={linkDraft}
        mathDraft={mathDraft}
        onApplyImage={applyImage}
        onApplyLink={applyLink}
        onApplyMath={applyMath}
        onClosePrompt={closePrompt}
        onFocusEditor={focusEditor}
        onImageDraftChange={setImageDraft}
        onLinkDraftChange={setLinkDraft}
        onMathDraftChange={setMathDraft}
        onOpenHelp={() => setActivePrompt('help')}
        onOpenImage={openImagePrompt}
        onOpenLink={openLinkPrompt}
        onOpenMath={openMathPrompt}
        onToggleBulletList={() => editor?.chain().focus().toggleBulletList().run()}
        onToggleHeading={(level) =>
          editor?.chain().focus().toggleHeading({ level }).run()
        }
        onToggleOrderedList={() => editor?.chain().focus().toggleOrderedList().run()}
        shellRef={toolbarShellRef}
      />
    </main>
  )
}

export default App
