type Context = Record<string, any>
type Observer = () => void
type Tree = {
  name?: string
  observers: Observer[]
  children: Record<string, Tree>
  proxied?: boolean
}

const trees = new WeakMap<Context, Tree>()

function escape(text: string): string {
  const node = document.createElement('p')
  node.textContent = text
  return node.innerHTML
}

function resolve(obj: Context, prop: string): string | undefined {
  if (typeof obj !== 'undefined') {
    const value = obj[prop]
    if (typeof value === 'function') {
      return value.call()
    }
    return value
  }
}

function pluck(context: Context, key: string): string {
  const properties = key.split('.')
  // @ts-ignore
  const value = properties.reduce(resolve, context) || ''
  return escape(value)
}

function queryAll(selectors: string, root: Document = document): Element[] {
  return Array.from(root.querySelectorAll(selectors))
}

type Binding = {
  target: any // Attr | Text
  key: string
  update: (this: any /* Attr | Text */, context: Context, key: string) => void
}

function bindings(node: Node): Binding[] {
  const results = []
  for (const child of node.childNodes) {
    switch (child.nodeType) {
      case 1:
        results.push(...bindAttributes(child as Element))
        results.push(...bindings(child))
        break
      case 3:
        results.push(...bindText(child))
        break
    }
  }
  return results
}

function notifyTree(node: Tree) {
  for (const fn of node.observers) fn()
  for (const name in node.children) {
    notifyTree(node.children[name])
  }
}

function appendChild(parent: Tree, name: string): Tree {
  let child = parent.children[name]
  if (!child) {
    child = {name: name, children: {}, observers: []}
    parent.children[name] = child
  }
  return child
}

function compose<T extends unknown, A extends unknown[], B, R>(
  a: (arg: B) => R,
  b: (...args: A) => B
): (this: T, ...args: A) => R {
  return function composed(this: T, ...args: A) {
    return a(b.apply(this, args))
  }
}

type Visitor = (node: Tree) => Tree

function descend(node: Tree, key: string, visitor: Visitor) {
  const fn = compose(visitor, appendChild)
  return key.split('.').reduce(fn, node)
}

// Finds or builds the observer tree for a context object.
function tree(context: Context): Tree {
  let root = trees.get(context)
  if (!root) {
    root = {children: {}, observers: []}
    trees.set(context, root)
  }
  return root
}

function bind(fragment: Node, context: Context): Node {
  const root = tree(context)
  for (const {target, key, update} of bindings(fragment)) {
    const observer = update.bind(target, context, key)
    const leaf = descend(root, key, proxyOnce(context))
    leaf.observers.push(observer)
    update.call(target, context, key)
  }
  return fragment
}

// Returns a visitor function to descend through a context object's
// attributes, proxying assignment operators to notify the observer
// tree of changes.
function proxyOnce(context: Context): Visitor {
  let current = context
  return function visit(node: Tree) {
    if (!node.proxied) {
      proxy(current, node.name!, notifyTree.bind(null, node))
      node.proxied = true
    }
    current = current[node.name!]
    return node
  }
}

function proxy(target: Context, property: string, after: () => unknown) {
  let current = target[property]
  Object.defineProperty(target, property, {
    get: () => current,
    set: value => {
      current = value
      after()
    }
  })
}

function updateText(this: Text, context: Context, key: string) {
  this.textContent = pluck(context, key)
}

function updateAttribute(this: Attr, context: Context, key: string) {
  this.value = pluck(context, key)
}

type Token = {type: 0 | 1; value: string}

function parse(text: string): Token[] {
  return text.split(/({{.+?}})/).map(token => {
    const stache = token.startsWith('{{') && token.endsWith('}}')
    return stache
      ? {type: 1, value: token.slice(2, -2).trim()}
      : {type: 0, value: token}
  })
}

function bindAttributes(node: Element): Binding[] {
  const bindings = []
  for (const attr of Array.from(node.attributes)) {
    for (const token of parse(attr.value)) {
      if (token.type === 1) {
        bindings.push({
          target: attr,
          key: token.value,
          update: updateAttribute
        })
      }
    }
  }
  return bindings
}

function bindText(node: Node): Binding[] {
  const tokens = parse(node.textContent!)
  if (tokens.length === 1 && tokens[0].type === 0) {
    return []
  }

  const bindings = []
  for (const token of tokens) {
    const text = document.createTextNode(token.value)
    node.parentNode!.insertBefore(text, node)
    if (token.type === 1) {
      bindings.push({
        target: text,
        key: token.value,
        update: updateText
      })
    }
  }

  node.parentNode!.removeChild(node)
  return bindings
}

type Template = (context: Context) => Node

export function template(name: string): Template {
  const template = document.querySelector<HTMLTemplateElement>(
    `template[data-name="${name}"]`
  )!
  const fragment = template.content
  return function evaluate(context: Context) {
    return bind(fragment.cloneNode(true), context)
  }
}

type Registry = Record<string, Template>

export function install(global = 'Templates'): void {
  const registry: Registry = {}
  const templates = queryAll('template[data-name]')
  const names = templates.map(el => el.getAttribute('data-name')!)
  for (const name of names) registry[name] = template(name)
  // @ts-ignore
  window[global] = registry
}
