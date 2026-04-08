import { mergeAttributes, Node } from '@tiptap/core'
import katex from 'katex'

type MathNodeAttributes = {
  formula: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      setBlockMath: (attributes: MathNodeAttributes) => ReturnType
      setInlineMath: (attributes: MathNodeAttributes) => ReturnType
    }
  }
}

const renderFormula = (
  element: HTMLElement,
  formula: string,
  displayMode: boolean,
): void => {
  const safeFormula = formula || '\\square'

  element.innerHTML = katex.renderToString(safeFormula, {
    displayMode,
    errorColor: '#d9480f',
    throwOnError: false,
  })
}

export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      formula: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="inlineMath"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'math-node math-node--inline',
        'data-formula': HTMLAttributes.formula,
        'data-type': 'inlineMath',
      }),
      HTMLAttributes.formula,
    ]
  },

  addCommands() {
    return {
      setInlineMath:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: attributes,
            type: this.name,
          }),
    }
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')

      dom.className = 'math-node math-node--inline'
      dom.dataset.type = 'inlineMath'
      dom.dataset.formula = String(node.attrs.formula ?? '')

      renderFormula(dom, String(node.attrs.formula ?? ''), false)

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false
          }

          const formula = String(updatedNode.attrs.formula ?? '')

          dom.dataset.formula = formula
          renderFormula(dom, formula, false)

          return true
        },
      }
    }
  },
})

export const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      formula: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="blockMath"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'math-node math-node--block',
        'data-formula': HTMLAttributes.formula,
        'data-type': 'blockMath',
      }),
      HTMLAttributes.formula,
    ]
  },

  addCommands() {
    return {
      setBlockMath:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: attributes,
            type: this.name,
          }),
    }
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')

      dom.className = 'math-node math-node--block'
      dom.dataset.type = 'blockMath'
      dom.dataset.formula = String(node.attrs.formula ?? '')

      renderFormula(dom, String(node.attrs.formula ?? ''), true)

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false
          }

          const formula = String(updatedNode.attrs.formula ?? '')

          dom.dataset.formula = formula
          renderFormula(dom, formula, true)

          return true
        },
      }
    }
  },
})
