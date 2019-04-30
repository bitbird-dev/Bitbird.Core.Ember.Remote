import Service from "@ember/service";
import RSVP from "rsvp";
import DS from "ember-data";
import { inject } from "@ember/service";
import { computed, get } from "@ember/object";
import { isBlank } from "@ember/utils";
import Logger from "ember";

export default Service.extend({
  session: inject(),

  store: inject(),

  init: function() {
    this._super(...arguments);
    //this.get('i18n');

    this._onStorageEvent = function(ea) {
      if (ea && ea.key === "session" && ea.oldValue !== ea.newValue) {
        this.notifyPropertyChange("token");
        this.notifyPropertyChange("expires");
        this.notifyPropertyChange("username");
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
   * The current session id
   */
  sessionId: computed({
    get() {
      return this.getLocally("sessionId");
    },
    set(key, value) {
      this.setLocally("sessionId", value);
      this.notifyPropertyChange("sessionId");
      return value;
    },
  }),

  /**
   * The current app token
   */
  token: computed({
    get() {
      return this.getLocally("token");
    },
    set(key, value) {
      this.setLocally("token", value);
      this.notifyPropertyChange("token");
      return value;
    },
  }),

  /**
   * Time when the current token expires
   */
  expires: computed({
    get() {
      return this.getLocally("expires");
    },
    set(key, value) {
      this.setLocally("expires", value);
      this.notifyPropertyChange("expires");
      return value;
    },
  }),

  /**
   * The current users username
   */
  username: computed({
    get() {
      return this.getLocally("username");
    },
    set(key, value) {
      this.setLocally("username", value);
      this.notifyPropertyChange("username");
      return value;
    },
  }),

  /**
   *  Reads a key-value-pair from the server where the value is a simple value
   * @param key
   * @param defaultValue
   * @returns {*}
   */
  readUserValue(key, defaultValue) {
    let self = this,
      userId = this.get("session").get("user.id");

    if (!userId) return null;

    let promise = new RSVP.Promise(function(resolve, reject) {
      let getPromise = self.getRemote(key, userId);
      if (!getPromise)
        return reject({
          isError: false,
          defaultValue: defaultValue,
          errors: null,
        });

      getPromise.then(
        function(f) {
          let value = f.get("object.value");
          if (value === undefined) {
            value = defaultValue;
          }
          resolve({
            isError: false,
            value: value,
            defaultValue: defaultValue,
            errors: null,
          });
        },
        function(errors) {
          reject({
            isError: true,
            defaultValue: defaultValue,
            errors: errors,
          });
        }
      );
    });

    return DS.PromiseObject.create({
      promise: promise,
    });
  },

  /**
   * Writes a key-value-pair on the server where the value is a simple value
   * @param key
   * @param value
   */
  writeUserValue(key, value) {
    let self = this,
      store = this.get("store"),
      user = this.get("session.user");
    if (!user) {
      return;
    }
    if (isBlank(get(user, "id"))) {
      return;
    }
    let setting = store.queryRecord("setting", {
      key: key,
      userId: user.get("id"),
      realmId: null,
    });

    let object = {
      value: value,
    };

    if (setting) {
      setting.then(
        function(setting) {
          if (setting) {
            setting.set("object", object);
          } else {
            setting = self.get("store").createRecord("setting", {
              key: key,
              object: object,
              user: user,
            });
          }
          self.setRemote(setting);
        },
        function() {
          setting = self.get("store").createRecord("setting", {
            key: key,
            object: object,
            user: user,
          });
          self.setRemote(setting);
        }
      );
    } else {
      setting = this.get("store").createRecord("setting", {
        key: key,
        object: object,
        user: user,
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
      userId = this.get("session.user.id");

    if (!userId) return null;

    return new RSVP.Promise(function(resolve, reject) {
      let getPromise = self.getRemote(key, userId);
      if (!getPromise) return defaultObject;

      getPromise.then(
        function(f) {
          let object = f.get("object");
          if (object === undefined) {
            object = defaultObject;
          }
          resolve(object);
        },
        function() {
          reject(defaultObject);
        }
      );
    });
  },

  /**
   * Writes a key-value-pair on the server where the value is an object
   * @param key
   * @param object
   */
  writeUserObject(key, object) {
    let self = this,
      store = this.get("store"),
      user = this.get("session.user");
    if (!user) {
      return;
    }
    if (isBlank(get(user, "id"))) {
      return;
    }

    let setting = store.queryRecord("setting", {
      key: key,
      userId: user.get("id"),
      realmId: null,
    });

    if (setting) {
      setting.then(function(setting) {
        setting.set("object", object);
        self.setRemote(setting);
      });
    } else {
      setting = this.get("store").createRecord("setting", {
        key: key,
        object: object,
        user: user,
      });
      this.setRemote(setting);
    }
  },

  getRemote: function(key, userId, realmId, value) {
    let store = this.get("store"),
      setting = null;

    //search locally
    let settings = store.peekAll("setting");
    for (let idx = 0, max = settings.get("length"); idx < max; idx++) {
      let current = settings.objectAt(idx);

      let currentUserId = current.get("userId") || null,
        currentRealmId = current.get("realmId") || null,
        currentKey = current.get("key") || null;

      if (
        currentKey === key &&
        (userId === undefined ||
          currentUserId === null ||
          currentUserId === userId) &&
        (realmId === undefined ||
          currentRealmId === null ||
          currentRealmId === realmId)
      ) {
        setting = current;
        break;
      }
    }

    if (!setting) {
      setting = store.queryRecord("setting", {
        key: key,
        userId: userId,
        realmId: realmId,
      });
    }

    return new RSVP.Promise(function(resolve, reject) {
      if (!setting.then) {
        resolve(setting);
        return;
      }

      setting.then(
        function(setting) {
          if (!setting) {
            setting = store.createRecord("setting", {
              key: key,
              userId: userId,
              realmId: realmId,
              valueId: value,
            });
          }
          resolve(setting);
        },
        function() {
          reject(new Error("settings.getRemote failed."));
        }
      );
    });
  },

  setRemote: function(setting) {
    setting.save().then(
      function() {
        //Logger.warn('setting save ok', null);
      },
      function() {
        Logger.info("setting save fail");
      }
    );

    //return localStorage.setItem(localKey, value);
  },

  fetchAll: function(userId, realmId) {
    let store = this.get("store");

    return store.query("setting", {
      user: userId,
      realm: realmId,
    });
  },

  getLocally: function(key) {
    if (!this._hash) {
      this.loadSettings();
    }

    return this._hash[key];
  },

  setLocally: function(key, value) {
    if (!this._hash) {
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
    localStorage.setItem("settings", JSON.stringify(hash));
    this._hash = hash;
  },

  saveSettings: function() {
    if (!this._hash) {
      this.createSettings();
    } else {
      localStorage.setItem("settings", JSON.stringify(this._hash));
    }
  },

  loadSettings: function() {
    let localStorageItem = localStorage.getItem("settings");
    if (!localStorageItem) {
      this.createSettings();
    } else {
      this._hash = JSON.parse(localStorageItem);
    }
  },
});
