import Service from '@ember/service';
import {inject} from '@ember/service';
import {computed} from '@ember/object';
import {next} from '@ember/runloop';
//import Logger from 'ember';

export default Service.extend({
    store: inject(),
    settings: inject(),
    security: inject(),
    routing: inject('-routing'),

    verifyInProgress: false,

    init: function () {
        this._super();

        this.set('client', Math.random().toString(16).slice(2));

        // Allow to pass a token via login?token=
        if (location.pathname === '/login' || location.pathname === '/login/') {
            let queryToken = this.getUrlParameterByName("token");
            if (queryToken) {
                this.setProperties({
                    token: queryToken,
                    expires: new Date(3000, 1, 1)
                });
                this.verify(function () {
                    document.location = this.getUrlParameterByName("redirect") || '/';
                }, function () {
                    document.location = this.getUrlParameterByName("redirect") || '/';
                });
                return;
            }
        }

        this.verify();
    },

    getUrlParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[[\]]/g, '\\$&');
        let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    },

    onVerificationSuccess() {
        this.get('security').refresh();
    },

    update(sessionModel) {
        if (!sessionModel) {
            this.logout();
            return;
        }
        this.setProperties({
            sessionId: sessionModel.get('id'),
            username: sessionModel.get('username'),
            token: sessionModel.get('loginToken'),
            expires: sessionModel.get('loginTokenExpires'),
            userId: sessionModel.belongsTo('user').id(),
            user: sessionModel.get('user'),
        });

        this.notifyPropertyChange('isLoggedIn');
    },

    login(username, password, onSuccess, onFail) {
        this.set('verifyInProgress', true);

        this.clean();

        let model = this.get('store').createRecord('session', {
            username: username,
            password: password,
            loginTokenExpires: new Date(2000, 0, 1)
        });

        let self = this;
        model.save().then(function (session) {
            self.update(session);
            self.set('verifyInProgress', false);
            self.onVerificationSuccess();
            if (onSuccess) {
                next(self, function () {
                    onSuccess.call(self, session)
                });
            }
        }, function (error) {
            self.set('verifyInProgress', false);
            if (onFail) onFail.call(self, error ? error.errors : undefined);
        });
    },

    verify(onSuccess, onFail) {
        let self = this,
            token = this.get('token'),
            sessionId = this.get('sessionId') || 'unset'; //backwards compatibility where sessionId was not used

        if (!token) {
            return this.logout();
        }

        this.set('verifyInProgress', true);

        this.get('store').findRecord('session', sessionId, {reload: true}).then(
            function (session) {
                self.update(session);
                self.set('verifyInProgress', false);
                self.onVerificationSuccess();
                if (onSuccess) {
                    next(self, function () {
                        onSuccess.call(self, session)
                    });
                }
            },
            function (error) {
                self.set('verifyInProgress', false);
                if (error && error.isAdapterError && error.errors && error.errors[0].status === "401") {
                    self.logout();
                    location.reload();
                }
                if (onFail) onFail.call(self);
            });
    },

    logout() {
        let self = this,
            sessions = this.get('store').peekAll('session');

        if (!sessions || !sessions.get('length')) {
            self.clean();
        }

        sessions.forEach(function (session) {
            session.deleteRecord();
            session.save().then(function () {
                self.clean();
            }, function () {
                self.clean();
            });
        });
    },

    clean() {
        this.setProperties({
            sessionId: null,
            username: null,
            token: null,
            expires: null,
            user: null,
            userId: null
        });
        try {
            this.get('store').unloadAll();
            this.get('security').unloadAll();
        } catch (exception) {
            //done
        }
    },

    _onStorageEvent: null,

    realmId: null,

    sessionId: computed('settings', 'settings.sessionId', {
        get() {
            return this.get('settings.sessionId')
        },
        set(sender, value) {
            this.set('settings.sessionId', value);
            this.notifyPropertyChange('sessionId');
        }
    }).volatile(),

    username: computed('settings', 'settings.username', {
        get() {
            return this.get('settings.username')
        },
        set(sender, value) {
            this.set('settings.username', value);
            this.notifyPropertyChange('username');
        }
    }).volatile(),

    token: computed('settings', 'settings.token', {
        get() {
            return this.get('settings.token')
        },
        set(sender, value) {
            this.set('settings.token', value);
            this.notifyPropertyChange('token');
        }
    }).volatile(),

    expires: computed('settings', 'settings.expires', {
        get() {
            return this.get('settings.expires')
        },
        set(sender, value) {
            this.set('settings.expires', value);
            this.notifyPropertyChange('expires');
        }
    }).volatile(),

    isLoggedIn: computed('sessionId', 'username', 'token', 'expires', 'userId', function () {
        let sessionId = this.get('sessionId'),
            token = this.get('token'),
            expires = this.get('expires'),
          userId = this.get('userId');

        return !!userId && !!sessionId && !!token && !!expires && new Date(expires) >= new Date();
    }),

    user: null,
    userId: null
});
