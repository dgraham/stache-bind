import {install, template} from '../stache-bind';

const assert = require('assert');
const jsdom = require('jsdom-global');

describe('mustache data binding', function() {
  jsdom();

  describe('template', function() {
    before(function() {
      document.body.innerHTML = `
        <template data-name="simple"><p>{{ name }}</p></template>
        <template data-name="chains"><p>{{ user.id }}</p></template>`;
    });

    it('replaces a property with its value', function() {
      const simple = template('simple');
      const fragment = simple({name: 'Hubot'});
      assert.equal('Hubot', fragment.textContent);
    });

    it('replaces a property with a function result', function() {
      const simple = template('simple');
      const fragment = simple({name: () => 'Hubot'});
      assert.equal('Hubot', fragment.textContent);
    });

    it('replaces missing property with empty string', function() {
      const simple = template('simple');
      const fragment = simple({});
      assert.equal('', fragment.textContent);
    });

    it('resolves property lookup chains', function() {
      const chains = template('chains');
      const fragment = chains({user: {id: 42}});
      assert.equal('42', fragment.textContent);
    });
  });

  describe('install', function() {
    before(function() {
      document.body.innerHTML = `
        <template data-name="avatar"></template>
        <template data-name="user"></template>`;
    });

    afterEach(function() {
      delete window.Templates;
      delete window.Mustaches;
    });

    it('installs to Templates window global', function() {
      install();
      assert(window.Templates);
      assert(window.Templates['avatar']);
      assert(window.Templates['user']);
    });

    it('installs to custom window global', function() {
      install('Mustaches');
      assert.equal(undefined, window.Templates);
      assert(window.Mustaches['avatar']);
      assert(window.Mustaches['user']);
    });
  });

  describe('data binding', function() {
    before(function() {
      document.body.innerHTML = `
        <template data-name="simple">
          <p class="{{ login }}">{{ name }}</p>
        </template>
        <template data-name="chains">
          <p>{{ user.avatar.url }}</p>
        </template>`;
    });

    it('updates the text nodes on model changes', function() {
      const user = {name: 'Hubot'};
      const simple = template('simple');
      const fragment = simple(user);
      assert.equal('Hubot', fragment.textContent.trim());

      user.name = 'Bender';

      assert.equal('Bender', fragment.textContent.trim());
    });

    it('updates attributes on model changes', function() {
      const user = {name: 'Hubot', login: 'hubot'};
      const simple = template('simple');
      const fragment = simple(user);
      const classes = fragment.firstElementChild.classList;
      assert(classes.contains('hubot'));

      user.login = 'bender';

      assert(classes.contains('bender'));
      assert(!classes.contains('hubot'));
    });

    it('observes deep hierarchy changes', function() {
      const context = {user: {avatar: {url: '/hubot.png'}}};
      const chains = template('chains');
      const fragment = chains(context);

      assert.equal('/hubot.png', fragment.textContent.trim());

      context.user.avatar = {url: '/bender.png'};
      assert.equal('/bender.png', fragment.textContent.trim());

      context.user = {avatar: {url: '/bb-8.png'}};
      assert.equal('/bb-8.png', fragment.textContent.trim());
    });

    it('observes a single model with multiple views', function() {
      const user = {name: 'Hubot'};
      const simple = template('simple');
      const fragment1 = simple(user);
      const fragment2 = simple(user);

      assert.equal('Hubot', fragment1.textContent.trim());
      assert.equal('Hubot', fragment2.textContent.trim());

      user.name = 'Bender';

      assert.equal('Bender', fragment1.textContent.trim());
      assert.equal('Bender', fragment2.textContent.trim());
    });
  });
});
