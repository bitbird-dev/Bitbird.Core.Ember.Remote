import Ember from 'ember';
import RSVP from 'rsvp';
import DS from 'ember-data';

export default Ember.Service.extend({
  session: Ember.inject.service(),

  store: Ember.inject.service(),
  i18n: Ember.inject.service(),
  localeFetcher: Ember.inject.service('i18n-fetch'),

  init: function() {
    this._super.apply(this, arguments);
    this.get('i18n');

    this._onStorageEvent =  function (ea){
      if(ea && ea.key === 'session' && ea.oldValue !== ea.newValue) {
        this.notifyPropertyChange('locale');
        this.notifyPropertyChange('token');
        this.notifyPropertyChange('expires');
        this.notifyPropertyChange('username');
      }
    };

    if (window.addEventListener) {
      window.addEventListener("storage", this._onStorageEvent, false);
    } else {
      window.attachEvent("onstorage", this._onStorageEvent);
    }
  },

  /**
   * Internal hash that holds the settings
   */
  _hash: null,

  /**
   * The current app token
   */
  token: Ember.computed({
    get() {
      return this.getLocally('token');
    },
    set(key, value) {
      this.setLocally('token', value);
      this.notifyPropertyChange('token');
      return value;
    }
  }),

  /**
   * Time when the current token expires
   */
  expires: Ember.computed({
    get() {
      return this.getLocally('expires');
    },
    set(key, value) {
      this.setLocally('expires', value);
      this.notifyPropertyChange('expires');
      return value;
    }
  }),

  /**
   * The current users username
   */
  username: Ember.computed({
    get() {
      return this.getLocally('username');
    },
    set(key, value) {
      this.setLocally('username', value);
      this.notifyPropertyChange('username');
      return value;
    }
  }),

  /**
   * Defines if the initial (~the first) locale loaded
   */
  isInitialLocaleLoaded: false,

  /**
   * Defines if a new locale is currently being loaded
   */
  isLocaleLoading: false,

  /**
   * Sets the current locale and loads it from server if necessary
   */
  locale: Ember.computed({
    get() {
      return this.getLocally('locale');
    },
    set(key, value) {
      this.set('isLocaleLoading', true);

      let self = this;
      let fetch = this.get('localeFetcher').fetch(value);
      fetch.then(function() {
        self.set('i18n.locale', value);
        self.setLocally('locale', value);
        self.notifyPropertyChange('locale');
        self.set('isLocaleLoading', false);
        self.set('isInitialLocaleLoaded', true);
      });
      return fetch;
    }
  }),

  /**
   *  Reads a key-value-pair from the server where the value is a simple value
   * @param key
   * @param defaultValue
   * @returns {*}
   */
  readUserValue(key, defaultValue) {
    let self = this,
      userId = this.get('session').get('user.id');

    if(!userId) return null;

    let promise = new RSVP.Promise(
      function(resolve, reject) {
        let getPromise = self.getRemote(key, userId);
        if(!getPromise) return reject(defaultValue);

        getPromise.then(function(f) {
          let value = f.get('object.value');
          if(value === undefined) {
            value = defaultValue;
          }
          resolve(value);
        }, function() {
          reject(defaultValue);
        });
      });

    return DS.PromiseObject.create({
      promise: promise
    });
  },

  /**
   * Writes a key-value-pair on the server where the value is a simple value
   * @param key
   * @param value
   */
  writeUserValue(key, value) {
    let self = this,
      store = this.get('store'),
      user = this.get('session.user');

    let setting = store.queryRecord('setting', {
      key: key,
      user: user.get('id'),
      realm: null
    });

    let object = {
      value: value
    };

    if(setting) {
      setting.then(function(setting) {
        if(setting)
        {
          setting.set('object', object);
        }
        else
        {
          setting = self.get('store').createRecord('setting', {
            key: key,
            object: object,
            user: user
          });
        }
        self.setRemote(setting);
      });
    } else {
      setting = this.get('store').createRecord('setting', {
        key: key,
        object: object,
        user: user
      });
      this.setRemote(setting);
    }
  },

  /**
   * Reads a key-value-pair from the server where the value is an object
   * @param key
   * @param defaultObject
   * @returns {*}
   */
  readUserObject(key, defaultObject) {
    let self = this,
      userId = this.get('session.user.id');

    if(!userId) return null;

    return new RSVP.Promise(
      function(resolve, reject) {
        let getPromise = self.getRemote(key, userId);
        if(!getPromise) return defaultObject;

        getPromise.then(function(f) {
          let object = f.get('object');
          if(object === undefined) {
            object = defaultObject;
          }
          resolve(object);
        }, function() {
          reject(defaultObject);
        });
      });
  },

  /**
   * Writes a key-value-pair on the server where the value is an object
   * @param key
   * @param object
   */
  writeUserObject(key, object) {
    let self = this,
      store = this.get('store'),
      user = this.get('session.user');

    let setting = store.queryRecord('setting', {
      key: key,
      user: user.get('id'),
      realm: null
    });

    if(setting) {
      setting.then(function(setting) {
        setting.set('object', object);
        self.setRemote(setting);
      });
    } else {
      setting = this.get('store').createRecord('setting', {
        key: key,
        object: object,
        user: user
      });
      this.setRemote(setting);
    }
  },

  getRemote: function(key, userId, realmId, value) {
    let store = this.get('store'),
      setting = null;

    //search locally
    let settings = store.peekAll('setting');
    for(let idx = 0, max = settings.get('length'); idx < max; idx++) {
      let current = settings.objectAt(idx);

      let currentUserId = current.get('userId') || null,
        currentRealmId = current.get('realmId') || null,
        currentKey = current.get('key') || null;

      if(currentKey === key && (userId === undefined || currentUserId === null || currentUserId === userId) && (realmId === undefined || currentRealmId === null || currentRealmId === realmId)) {
        setting = current;
        break;
      }
    }

    if(!setting)
    {
      setting = store.queryRecord('setting', {
        key: key,
        user: userId,
        realm: realmId
      });
    }

    return new RSVP.Promise(function(resolve, reject) {
      if(!setting.then) {
        resolve(setting);
        return;
      }

      setting.then(function(setting) {
        if(!setting) {
          setting = store.createRecord('setting', {
            key: key,
            userId: userId,
            realmId: realmId,
            value: value
          })
        }
        resolve(setting);
      }, function() {
        reject(new Error('settings.getRemote failed.'));
      })
    });
  },

  setRemote: function(setting) {
    setting.save().then(function(){
      Ember.Logger.warn('setting save ok');
    }, function() {
      Ember.Logger.info('setting save fail');
    });

    //return localStorage.setItem(localKey, value);
  },

  fetchAll: function(userId, realmId) {
    let store = this.get('store'),
      settings = null;

    settings = store.query('setting', {
      user: userId,
      realm: realmId
    });
  },

  getLocally: function(key) {
    if(!this._hash) {
      this.loadSettings();
    }

    return this._hash[key];
  },

  setLocally: function(key, value) {
    if(!this._hash) {
      this.loadSettings();
    }

    this._hash[key] = value;
    this.saveSettings();
  },

  createSettings: function() {
    let hash = {};
    /*for(let prop in this.Keys){
     if(!this.Keys.hasOwnProperty(prop)) {
     continue;
     }
     hash[prop] = null;
     }*/
    localStorage.setItem('settings', JSON.stringify(hash));
    this._hash = hash;
  },

  saveSettings: function() {
    if(!this._hash) {
      this.createSettings();
    } else {
      localStorage.setItem('settings', JSON.stringify(this._hash));
    }
  },

  loadSettings: function() {
    let localStorageItem = localStorage.getItem('settings');
    if(!localStorageItem) {
      this.createSettings();
    } else {
      this._hash = JSON.parse(localStorageItem);
    }
  }
});
