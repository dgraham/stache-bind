# Mustache data binding

Simple [data binding][binding] with [Mustache][mustache] templates.

[mustache]: https://mustache.github.io
[binding]: https://en.wikipedia.org/wiki/Data_binding

## Motivation

Web applications frequently need to reflect changes to model data in the
view presented to the user. This is commonly done with many calls to
`document.querySelector`, followed by attribute assignments.

```js
// Model data.
const user = {name: 'Hubot', login: 'hubot', avatar: 'https://github.com/hubot.png'};

// Display the model in the view.
const link = document.querySelector('.avatar-link');
link.setAttribute('title', user.login);
link.setAttribute('href', user.url);

const image = link.querySelector('.avatar');
image.setAttribute('alt', user.login);
image.src = user.avatar;
```

When the `user` model data changes, all elements that depend on those values
must be found and reassigned. This style becomes difficult to maintain
as the number of templates and models grows. And design changes
to the markup require a careful inspection of the corresponding JavaScript
selectors to ensure they stay in sync.

So while an ad hoc solution works well as a starting point, we often want
a reusable pattern as an app becomes more complex.

## Data binding

One solution is to apply the [Model-view-controller][mvc] design
pattern and bind the view (DOM nodes) as observers of model data. When
the model changes, it notifies the observers, and updated values appear
in the page.

This library provides one-way data binding: data flows from the model into the
view, as in MVC. Some other frameworks implement *two-way* data binding,
propagating changes in the view, typically from an `<input>` element or
`click` event, directly back into the model.

One-way data binding prescribes no method of moving view changes into the
model, but a representative controller looks like the following example.

```js
// The controller in one-way data binding.
const input = document.querySelector('.name-input');
input.addEventListener('change', function(event) {
  // Update the model, transform data, notify other components, etc.
  user.name = input.value;
});
```

[mvc]: https://en.wikipedia.org/wiki/Model–view–controller

## Usage

Store markup templates in the page with a unique `data-name` attribute.

```html
<template data-name="avatar">
  <div class="avatar-container" data-id="{{ id }}" data-user="{{ user.login }}">
    <a class="avatar-link" href="{{ user.url }}" title="{{ user.login }}" target="_blank">
      <div class="avatar-frame">
        <img class="avatar photo" alt="{{ user.login }}" src="{{ user.avatar }}" height="230" width="230">
      </div>
      <h1 class="name">{{ user.name }}</h1>
    </a>
  </div>
</template>
```

Bind a model object—Mustache calls this a context—to a template.

```js
import {template} from 'stache-bind';

const context = {
  id: 42,
  user: {
    name: 'Hubot',
    login: 'hubot',
    url: 'https://github.com/hubot',
    avatar: 'https://github.com/hubot.png?size=460'
  }
};

// Create a single template function using its data-name.
const avatar = template('avatar');

// Build a new DocumentFragment from the template, bound to the model data.
const fragment = avatar(context);

// Display the new fragment in the page.
document.body.appendChild(fragment);

// Sometime later the model data changes, and the view is updated.
context.user.name = 'Bender';
```

Any JavaScript object may be used as the template's rendering context.

## Limitations

This is a minimally viable Mustache parser, and only the `{{ }}` stache syntax
is currently supported. As [browser support][proxy-support] for [`Proxy`][proxy]
improves, it can be used to observe `Array` mutations and implement
the `{{#}} {{/}}` iterator section syntax.

[proxy]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
[proxy-support]: http://caniuse.com/#feat=proxy

## Development

```
npm install
npm test
```

## Alternatives

A sample of full-fledged JavaScript data binding frameworks.

- [Ember](http://emberjs.com)
- [React](http://facebook.github.io/react/)
- [Rivets](http://rivetsjs.com)

## License

Distributed under the MIT license. See LICENSE for details.
