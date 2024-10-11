function attributeSelector(name, value = false) {
  return `//*[@${name}=${JSON.stringify(value)}]`;
}

function getSelectorPart(node, optimized, attributes = []) {
  let value;
  let isSvg = false;
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      if (!(node instanceof Element)) {
        return;
      }
      isSvg = node.namespaceURI === 'http://www.w3.org/2000/svg';
      if (optimized) {
        for (const attribute of attributes) {
          value = node.getAttribute(attribute) ?? '';
          if (value) {
            return new SelectorPart(attributeSelector(attribute, value), true);
          }
        }
      }
      if (node.id) {
        return new SelectorPart(attributeSelector('id', node.id), true);
      }
      value = isSvg ? `*[name()="${node.localName}"]` : node.localName;
      break;
    case Node.ATTRIBUTE_NODE:
      value = '@' + node.nodeName;
      break;
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
      value = 'text()';
      break;
    case Node.PROCESSING_INSTRUCTION_NODE:
      value = 'processing-instruction()';
      break;
    case Node.COMMENT_NODE:
      value = 'comment()';
      break;
    case Node.DOCUMENT_NODE:
      value = '';
      break;
    default:
      value = '';
      break;
  }

  const index = getXPathIndexInParent(node);
  if (index > 0) {
    value += `[${index}]`;
  }

  return new SelectorPart(value, node.nodeType === Node.DOCUMENT_NODE);
}

function getXPathIndexInParent(node) {
  function areNodesSimilar(left, right) {
    if (left === right) {
      return true;
    }

    if (left instanceof Element && right instanceof Element) {
      return left.localName === right.localName;
    }

    if (left.nodeType === right.nodeType) {
      return true;
    }

    const leftType = left.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : left.nodeType;
    const rightType = right.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType;
    return leftType === rightType;
  }

  const children = node.parentNode ? node.parentNode.children : null;
  if (!children) {
    return 0;
  }
  let hasSameNamedElements;
  for (let i = 0; i < children.length; ++i) {
    if (areNodesSimilar(node, children[i]) && children[i] !== node) {
      hasSameNamedElements = true;
      break;
    }
  }
  if (!hasSameNamedElements) {
    return 0;
  }
  let ownIndex = 1;
  for (let i = 0; i < children.length; ++i) {
    if (areNodesSimilar(node, children[i])) {
      if (children[i] === node) {
        return ownIndex;
      }
      ++ownIndex;
    }
  }

  throw new Error('This is impossible; a child must be the child of the parent');
}

function isInShadow(node) {
  for (; node; node = node.parentNode) {
      if (node.toString() === "[object ShadowRoot]") {
          return true;
      }
  }
  return false;
}

function computeXPath(node, optimized, attributes) {
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return '/';
  }

  const selectors = [];

  const buffer = [];
  let contextNode = node;
  while (contextNode !== document && contextNode) {
    const part = getSelectorPart(contextNode, optimized, attributes);
    if (!part) {
      return;
    }
    buffer.unshift(part);
    if (part.optimized) {
      contextNode = contextNode.getRootNode();
    } else {
        contextNode = contextNode.parentNode;
    }
    if ((part.value === buffer[0]?.value && (part.value.slice(0,8) === "//*[@id=")) && contextNode.parentNode === null) {
      selectors.unshift((buffer[0].optimized ? '' : '/') + buffer.join('/'));
      buffer.splice(0, buffer.length);
      contextNode = contextNode.host;
    }
  }

  if (buffer.length) {
    selectors.unshift((buffer[0].optimized ? '' : '/') + buffer.join('/'));
  }

  if (!selectors.length || selectors.length > 1) {
    return;
  }

  return selectors;
}


class SelectorPart {
  constructor(value, optimized) {
    this.value = value;
    this.optimized = optimized || false;
  }

  toString() {
    return this.value;
  }
}