import EmberObject from '@ember/object';
import QueryRouteMixin from 'bitbird-core-ember-remote/mixins/query-route';
import { module, test } from 'qunit';

module('Unit | Mixin | query-route', function() {
  // Replace this with your real tests.
  test('it works', function (assert) {
    let QueryRouteObject = EmberObject.extend(QueryRouteMixin);
    let subject = QueryRouteObject.create();
    assert.ok(subject);
  });
});
