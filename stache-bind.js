function escape(text) {
  const node = document.createElement('p');
  node.textContent = text;
  return node.innerHTML;
}

function fragment(html) {
  const node = document.createElement('p');
  node.innerHTML = html.trim();

  const container = document.createDocumentFragment();
  for (const child of node.childNodes) {
    container.appendChild(child);
  }
  return container;
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

function replace(match, key) {
  const properties = key.trim().split('.');
  const value = properties.reduce(resolve, this) || '';
  return escape(value);
}

function nodes(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function blueprint(name) {
  const template = document.querySelector(`template[data-name="${name}"]`);
  return template.innerHTML;
}

export function template(name) {
  const stache = /{{(.+?)}}/g;
  const template = blueprint(name);
  return function evaluate(context) {
    return fragment(template.replace(stache, replace.bind(context)));
  };
}

export function install(global = 'Templates') {
  const registry = {};
  const templates = nodes('template[data-name]');
  const names = templates.map(el => el.getAttribute('data-name'));
  for (const name of names) registry[name] = template(name);
  window[global] = registry;
}
