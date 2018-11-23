import Ember from 'ember';

export default Ember.Service.extend({
  store: Ember.inject.service('store'),

  rights: Ember.computed({
    get(){
      return this.get('store').peekAll('right');
    }
  }),

  rightKeys: Ember.computed('rights', function () {
    return this.get('rights').map(function(model) {
      return model.get('name');
    });
  }),

  roles: Ember.computed({
    get(){
      return this.get('store').peekAll('role');
    }
  }),

  refresh() {
    this.get('store').findAll('role');
    //this.get('store').findAll('right');
    this.notifyPropertyChange('rights');
    this.notifyPropertyChange('roles');
  },

  unloadAll() {
    this.notifyPropertyChange('rights');
    this.notifyPropertyChange('roles');
  },

  hasRights(params) {
    var hasRights = true;
    if (!params || params.length==0) {
      Ember.assert('At least one rightKey is expected');
      return hasRights;
    }
    var rights = this.get('rightKeys');
    if (!rights) {
      Ember.assert('Security service must provide rightKeys');
      return hasRights;
    }
    params.forEach(function (arg){
      if (rights.indexOf(arg)==-1)
      {
        hasRights = false;
        return hasRights;
      }
    });
    return hasRights;
  },
  hasRight(right) {
    return this.hasRights([right]);
  },
  hasAnyRight(params) {
    var hasRights = true;
    if (!params || params.length==0) {
      Ember.assert('At least one rightKey is expected');
      return hasRights;
    }
    var rights = this.get('rightKeys');
    if (!rights) {
      Ember.assert('Security service must provide rightKeys');
      return hasRights;
    }
    hasRights = false;
    params.forEach(function (arg){
      if (rights.indexOf(arg)>=0)
      {
        hasRights = true;
        return hasRights;
      }
    });
    return hasRights;
  }
});
