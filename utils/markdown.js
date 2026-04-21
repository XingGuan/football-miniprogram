// utils/markdown.js - Markdown 解析工具
// 将 Markdown 转换为小程序可渲染的节点结构

/**
 * 解析 Markdown 文本为节点数组
 * @param {string} markdown Markdown 文本
 * @returns {Array} 节点数组
 */
function parseMarkdown(markdown) {
  if (!markdown) return []

  // 预处理：智能分段（只在需要时处理）
  let text = markdown

  const lines = text.split('\n')
  const nodes = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 代码块
    if (line.startsWith('```')) {
      const codeBlock = parseCodeBlock(lines, i)
      nodes.push(codeBlock.node)
      i = codeBlock.endIndex + 1
      continue
    }

    // 标题
    if (line.startsWith('#')) {
      nodes.push(parseHeading(line))
      i++
      continue
    }

    // 引用
    if (line.startsWith('>')) {
      nodes.push(parseBlockquote(line))
      i++
      continue
    }

    // 无序列表（支持 - 后面有空格或直接跟 ** 的情况）
    if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*-\*\*/)) {
      const listResult = parseList(lines, i, 'ul')
      nodes.push(listResult.node)
      i = listResult.endIndex + 1
      continue
    }

    // 有序列表
    if (line.match(/^\s*\d+\.\s/) || line.match(/^\s*\d+\.\*\*/)) {
      const listResult = parseList(lines, i, 'ol')
      nodes.push(listResult.node)
      i = listResult.endIndex + 1
      continue
    }

    // 分隔线
    if (line.match(/^[-*_]{3,}\s*$/)) {
      nodes.push({ type: 'hr' })
      i++
      continue
    }

    // 空行
    if (!line.trim()) {
      i++
      continue
    }

    // 普通段落
    nodes.push(parseParagraph(line))
    i++
  }

  return nodes
}

/**
 * 解析标题
 */
function parseHeading(line) {
  // 先匹配连续的 # 号
  const hashMatch = line.match(/^(#{1,6})/)
  if (!hashMatch) {
    return parseParagraph(line)
  }

  const level = hashMatch[1].length
  // 获取 # 后面的内容（去掉开头的空格）
  let text = line.substring(level).replace(/^\s*/, '')

  // 处理标题内的 **xxx** 格式，去掉外层的 **
  if (text.startsWith('**') && text.includes('**', 2)) {
    const endIndex = text.indexOf('**', 2)
    if (endIndex === text.length - 2) {
      // 整个标题被 ** 包裹，去掉它们
      text = text.substring(2, text.length - 2)
    }
  }

  if (!text) {
    return parseParagraph(line)
  }

  return {
    type: 'heading',
    level,
    children: parseInline(text)
  }
}

/**
 * 解析引用块
 */
function parseBlockquote(line) {
  const text = line.replace(/^>\s*/, '')
  return {
    type: 'blockquote',
    children: parseInline(text)
  }
}

/**
 * 解析代码块
 */
function parseCodeBlock(lines, startIndex) {
  const firstLine = lines[startIndex]
  const language = firstLine.slice(3).trim()
  const codeLines = []
  let i = startIndex + 1

  while (i < lines.length) {
    if (lines[i].startsWith('```')) {
      break
    }
    codeLines.push(lines[i])
    i++
  }

  return {
    node: {
      type: 'code',
      language,
      content: codeLines.join('\n')
    },
    endIndex: i
  }
}

/**
 * 解析列表
 */
function parseList(lines, startIndex, type) {
  const items = []
  let i = startIndex
  // 支持 - 后面有空格或没空格的情况
  const regex = type === 'ul' ? /^\s*[-*+]\s*(.+)$/ : /^\s*\d+\.\s*(.+)$/

  while (i < lines.length) {
    const line = lines[i]
    const match = line.match(regex)

    if (!match) {
      break
    }

    items.push({
      type: 'li',
      children: parseInline(match[1])
    })
    i++
  }

  return {
    node: {
      type,
      items
    },
    endIndex: i - 1
  }
}

/**
 * 解析段落
 */
function parseParagraph(line) {
  return {
    type: 'paragraph',
    children: parseInline(line)
  }
}

/**
 * 解析行内元素
 */
function parseInline(text) {
  if (!text) return [{ type: 'text', text: '' }]

  // 预处理：清理开头的 ** 如果没有配对
  let cleanText = text.trim()

  const nodes = []
  let remaining = cleanText

  while (remaining) {
    // 粗体 **text** (完整格式)
    let match = remaining.match(/^\*\*(.+?)\*\*(.*)$/)
    if (match) {
      nodes.push({
        type: 'strong',
        text: match[1]
      })
      remaining = match[2]
      continue
    }

    // 粗体在中间 xxx**text**xxx
    match = remaining.match(/^(.+?)\*\*(.+?)\*\*(.*)$/)
    if (match) {
      nodes.push({ type: 'text', text: match[1] })
      nodes.push({
        type: 'strong',
        text: match[2]
      })
      remaining = match[3]
      continue
    }

    // __text__ 格式
    match = remaining.match(/^__(.+?)__(.*)$/)
    if (match) {
      nodes.push({
        type: 'strong',
        text: match[1]
      })
      remaining = match[2]
      continue
    }

    // 行内代码 `code`
    match = remaining.match(/^`([^`]+)`(.*)$/)
    if (match) {
      nodes.push({
        type: 'code-inline',
        text: match[1]
      })
      remaining = match[2]
      continue
    }

    match = remaining.match(/^(.+?)`([^`]+)`(.*)$/)
    if (match) {
      nodes.push({ type: 'text', text: match[1] })
      nodes.push({
        type: 'code-inline',
        text: match[2]
      })
      remaining = match[3]
      continue
    }

    // 链接 [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/)
    if (match) {
      nodes.push({
        type: 'link',
        text: match[1],
        url: match[2]
      })
      remaining = match[3]
      continue
    }

    // 普通文本（清理未配对的 ** ）
    let finalText = remaining
    // 如果开头是未配对的 **，去掉它
    if (finalText.startsWith('**') && !finalText.substring(2).includes('**')) {
      finalText = finalText.substring(2)
    }
    // 如果结尾是未配对的 **，去掉它
    if (finalText.endsWith('**') && !finalText.slice(0, -2).includes('**')) {
      finalText = finalText.slice(0, -2)
    }

    nodes.push({
      type: 'text',
      text: finalText
    })
    break
  }

  return nodes
}

/**
 * 将节点数组转换为 rich-text 可用的节点格式
 * @param {Array} nodes 解析后的节点数组
 * @returns {Array} rich-text 节点
 */
function toRichTextNodes(nodes) {
  return nodes.map(node => {
    switch (node.type) {
      case 'heading':
        return {
          name: `h${node.level}`,
          attrs: {
            class: `md-h${node.level}`
          },
          children: inlineToRichText(node.children)
        }

      case 'paragraph':
        return {
          name: 'p',
          attrs: {
            class: 'md-p'
          },
          children: inlineToRichText(node.children)
        }

      case 'blockquote':
        return {
          name: 'blockquote',
          attrs: {
            class: 'md-blockquote'
          },
          children: inlineToRichText(node.children)
        }

      case 'code':
        return {
          name: 'pre',
          attrs: {
            class: `md-code-block${node.language ? ` language-${node.language}` : ''}`
          },
          children: [{
            name: 'code',
            children: [{
              type: 'text',
              text: node.content
            }]
          }]
        }

      case 'ul':
      case 'ol':
        return {
          name: node.type,
          attrs: {
            class: `md-${node.type}`
          },
          children: node.items.map(item => ({
            name: 'li',
            attrs: {
              class: 'md-li'
            },
            children: inlineToRichText(item.children)
          }))
        }

      case 'hr':
        return {
          name: 'hr',
          attrs: {
            class: 'md-hr'
          }
        }

      default:
        return {
          name: 'span',
          children: [{
            type: 'text',
            text: JSON.stringify(node)
          }]
        }
    }
  })
}

/**
 * 将行内节点转换为 rich-text 格式
 */
function inlineToRichText(nodes) {
  return nodes.map(node => {
    switch (node.type) {
      case 'text':
        return {
          type: 'text',
          text: node.text
        }

      case 'strong':
        return {
          name: 'strong',
          attrs: {
            class: 'md-strong'
          },
          children: [{
            type: 'text',
            text: node.text
          }]
        }

      case 'em':
        return {
          name: 'em',
          attrs: {
            class: 'md-em'
          },
          children: [{
            type: 'text',
            text: node.text
          }]
        }

      case 'code-inline':
        return {
          name: 'code',
          attrs: {
            class: 'md-code-inline'
          },
          children: [{
            type: 'text',
            text: node.text
          }]
        }

      case 'link':
        return {
          name: 'a',
          attrs: {
            class: 'md-link',
            href: node.url
          },
          children: [{
            type: 'text',
            text: node.text
          }]
        }

      default:
        return {
          type: 'text',
          text: node.text || ''
        }
    }
  })
}

/**
 * 渲染 Markdown 为 rich-text 节点
 * @param {string} markdown
 * @returns {Array}
 */
function render(markdown) {
  const nodes = parseMarkdown(markdown)
  return toRichTextNodes(nodes)
}

/**
 * 简单转换（用于消息气泡等简单场景）
 * 只处理基本格式，返回纯文本
 */
function simpleRender(markdown) {
  if (!markdown) return ''

  return markdown
    .replace(/\*\*(.+?)\*\*/g, '$1')  // 移除粗体标记
    .replace(/\*(.+?)\*/g, '$1')      // 移除斜体标记
    .replace(/`(.+?)`/g, '$1')        // 移除行内代码标记
    .replace(/#{1,6}\s+/g, '')        // 移除标题标记
    .replace(/^>\s*/gm, '')           // 移除引用标记
    .replace(/^[-*+]\s+/gm, '• ')     // 转换无序列表
    .replace(/^\d+\.\s+/gm, '')       // 简化有序列表
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 提取链接文本
}

module.exports = {
  parseMarkdown,
  toRichTextNodes,
  render,
  simpleRender,
  parseInline,
  inlineToRichText
}
