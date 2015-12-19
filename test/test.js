import {install, template} from '../stache-bind';

const assert = require('assert');
const jsdom = require('mocha-jsdom');

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
});
