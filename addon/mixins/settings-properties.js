import Ember from 'ember';
import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import { inject as service } from '@ember/service';
import { Promise } from 'rsvp';
import { isArray } from '@ember/array';

export default Mixin.create({
  /**
   * Injected Setting-Service
   */
  settings: service(),

  /**
   * Sets up the mixin and all observers
   */
  init (){
    this._super();

    let settingProperties = this.get('settingProperties');
    if(!settingProperties) return;
    if(!isArray(settingProperties)) {
      settingProperties = [settingProperties];
    }

    settingProperties.forEach(function(keyPropertyName) {
      assert("Names of SettingProperties must end with 'SettingKey'", keyPropertyName.endsWith('SettingKey'));

      let valuePropertyName = keyPropertyName.substr(0, keyPropertyName.length - 10);

      //Initially read the setting value
      this.readSettingValue(valuePropertyName);

      //Observe keyPropertyName and the value
      this.addObserver(keyPropertyName, this, this._handleSettingPropertyKeyChanged);
      this.addObserver(valuePropertyName, this, this._handleSettingPropertyValueChanged);
    }, this);
  },

  /**
   * A List of property names that provide the key for the property to be saved.
   * Example: The property 'isVisibleSettingKey' provides the key that is used to remotely store the 'isVisible' property.
   * If the server does not find a value for the given key, you can provide a default value via the property 'isVisibleSettingDefaultValue'
   */
  settingProperties: null,

  /**
   * Reads the setting for a given property name from the server. If the SettingKey is not found, a default value is used.
   * @param valuePropertyName The property name to get from the server
   * @private
   */
  readSettingValue(valuePropertyName) {
    let self = this,
      settingKey = this.get(valuePropertyName + 'SettingKey'),
      defaultValuePropertyName = valuePropertyName + 'SettingDefaultValue';

    if(!settingKey) {
      return new Promise(function(resolve, reject) { reject(); });
    }

    let defaultValue = this.get(defaultValuePropertyName);

    let settingValue = this.get('settings').readUserValue(settingKey, defaultValue);
    if(this.get(valuePropertyName) === undefined)
    {
      self.set(valuePropertyName, defaultValue);
    }
    if(settingValue && settingValue.then)
    {
      settingValue.then(function(value) {
        self.set(valuePropertyName, value);
      });
      return settingValue;
    }
    return new Promise(function(resolve) { resolve(settingValue); });
  },

  /**
   * Writes a value to the server if it is not equal to the default value
   * @param valuePropertyName
   * @private
   */
  _writeSettingValue(valuePropertyName) {
    let settingKey = this.get(valuePropertyName + 'SettingKey');

    if(!settingKey) return;

    let value = this.get(valuePropertyName);

    this.get('settings').writeUserValue(settingKey, value);
  },

  _handleSettingPropertyKeyChanged (sender, key) {
    this.readSettingValue(key.substr(0, key.length - 10));
  },

  _handleSettingPropertyValueChanged (sender, key) {
    this._writeSettingValue(key);
  }
});
