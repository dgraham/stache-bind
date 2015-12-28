function escape(text) {
  const node = document.createElement('p');
  node.textContent = text;
  return node.innerHTML;
}

function resolve(obj, prop) {
  if (typeof obj !== 'undefined') {
    const value = obj[prop];
    if (typeof value === 'function') {
      return value.call();
    }
    return value;
  }
}

function replace(key) {
  const properties = key.split('.');
  const value = properties.reduce(resolve, this) || '';
  return escape(value);
}

function queryAll(selectors, root = document) {
  return Array.from(root.querySelectorAll(selectors));
}

function bindings(node) {
  const results = [];
  for (const child of node.childNodes) {
    switch (child.nodeType) {
    case 1:
      results.push(...bindAttributes(child));
      results.push(...bindings(child));
      break;
    case 3:
      results.push(...bindText(child));
      break;
    }
  }
  return results;
}

function notifyTree(node) {
  for (const fn of node.observers) fn();
  for (const name in node.children)
    notifyTree(node.children[name]);
}

function appendChild(parent, name) {
  const child = parent.children[name];
  return child ? child : parent.children[name] = {
    children: {}, observers: []
  };
}

function descend(node, key) {
  return key.split('.').reduce(appendChild, node);
}

function bind(node, context) {
  // Build observer tree.
  const root = {children: {}, observers: []};
  for (const {target, key, update} of bindings(node)) {
    const observer = update.bind(target, context, key);
    const leaf = descend(root, key);
    leaf.observers.push(observer);
    update.call(target, context, key);
  }

  // Proxy assignment to invalidate observer tree.
  function proxyNode(node, context) {
    for (const name in node.children) {
      const child = node.children[name];
      proxy(context, name, notifyTree.bind(null, child));
      proxyNode(child, context[name]);
    }
  }
  proxyNode(root, context);
  return node;
}

function proxy(target, property, after) {
  let current = target[property];
  Object.defineProperty(target, property, {
    get: () => current,
    set: (value) => {
      current = value;
      after();
    }
  });
}

function updateText(context, key) {
  const value = replace.call(context, key);
  this.textContent = value;
}

function updateAttribute(context, key) {
  const value = replace.call(context, key);
  this.value = value;
}

function parse(text) {
  const tokens = [];
  for (const token of text.split(/({{.+?}})/)) {
    const stache = token.startsWith('{{') && token.endsWith('}}');
    tokens.push(stache
      ? {type: 1, value: token.slice(2, -2).trim()}
      : {type: 0, value: token});
  }
  return tokens;
}

function bindAttributes(node) {
  const bindings = [];
  for (const attr of Array.from(node.attributes)) {
    for (const token of parse(attr.value)) {
      if (token.type === 1) {
        bindings.push({
          target: attr,
          key: token.value,
          update: updateAttribute
        });
      }
    }
  }
  return bindings;
}

function bindText(node) {
  const tokens = parse(node.textContent);
  if (tokens.length === 1 && tokens[0].type === 0) {
    return [];
  }

  const bindings = [];
  for (const token of tokens) {
    const text = document.createTextNode(token.value);
    node.parentNode.insertBefore(text, node);
    if (token.type === 1) {
      bindings.push({
        target: text,
        key: token.value,
        update: updateText
      });
    }
  }

  node.parentNode.removeChild(node);
  return bindings;
}

export function template(name) {
  const template = document.querySelector(`template[data-name="${name}"]`);
  const fragment = template.content;
  return function evaluate(context) {
    return bind(fragment.cloneNode(true), context);
  };
}

export function install(global = 'Templates') {
  const registry = {};
  const templates = queryAll('template[data-name]');
  const names = templates.map(el => el.getAttribute('data-name'));
  for (const name of names) registry[name] = template(name);
  window[global] = registry;
}
