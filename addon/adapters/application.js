import Ember from 'ember';
import DS from 'ember-data';
import { getOwner } from '@ember/application';

export default DS.JSONAPIAdapter.extend({
  session: Ember.inject.service(),
  connection: Ember.inject.service(),
  environment: Ember.computed(function() {
    return getOwner(this).resolveRegistration('config:environment');
  }),

  host: Ember.computed('environment', function() {
    return this.get('environment.APP.API.HOST');
  }),
  namespace: Ember.computed('environment', function() {
    return this.get('environment.APP.API.NAMESPACE');
  }),
  headers: Ember.computed({
    get() {
      return this.get('connection').get('headers');
    }
  }).volatile(),

  findRecord (store, type, id, snapshot) {
    if(snapshot.record._notifyFindAllProgress)
    {
      snapshot.record._notifyFindAllProgress('', true);
      let promise = this._super(store, type, id, snapshot),
        onFinished = function(){ snapshot.record._notifyFindAllProgress('', false) };

      promise.then(onFinished, onFinished);

      return promise;
    }

    return this._super(store, type, id, snapshot);
  },
  findHasMany (store, snapshot, url, relationship) {
    if(relationship.kind == "hasMany" && snapshot.record._notifyFindAllProgress)
    {
      snapshot.record._notifyFindAllProgress(relationship.key, true);
      let promise = this._super(store, snapshot, url, relationship),
        onFinished = function() { snapshot.record._notifyFindAllProgress(relationship.key, false); };

      promise.then(onFinished, onFinished);

      return promise;
    }

    return this._super(store, snapshot, url, relationship)
  },

  urlForFindRecord(id, modelName, snapshot) {
    let url = this._super(id, modelName, snapshot);

    url = this._processParams(url, snapshot);

    return url;
  },

  urlForCreateRecord (modelName, snapshot) {
    let url = this._super(modelName, snapshot);

    url = this._processParams(url, snapshot);

    return url;
  },

  /**
   * Adds key-value pairs from snapshot.adapteroptions.params to the url query.
   * This is by default not supported by urlForFindRecord, urlForCreateRecord, etc.
   * @param url
   * @param snapshot
   * @returns {*}
   * @private
   */
  _processParams(url, snapshot) {
    if(snapshot.adapterOptions) {
      url = new URL(url);

      let params = snapshot.adapterOptions.params,
        search = url.search,
        origin = url.origin,
        pathname = url.pathname;

      if(params) {
        if (!search) search = '?';
        for (let name in params) {
          if (params[name] !== undefined) {
            search += `${name}=${params[name]}&`;
          }
        }
        search = search.substring(0, search.length-1);

      }

      if(snapshot.adapterOptions.pathname) {
        pathname += '/'+snapshot.adapterOptions.pathname;
        pathname = pathname.replace('//', '/');
      }

      url = origin + pathname + search;
    }

    return url;
  }
});
