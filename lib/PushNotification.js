"use strict";
/*
 * Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_native_1 = require("react-native");
var push_notification_ios_1 = __importDefault(require("@react-native-community/push-notification-ios"));
var core_1 = __importStar(require("@aws-amplify/core"));
var logger = new core_1.ConsoleLogger('Notification');
var RNPushNotification = react_native_1.NativeModules.RNPushNotification;
var REMOTE_NOTIFICATION_RECEIVED = 'remoteNotificationReceived';
var REMOTE_TOKEN_RECEIVED = 'remoteTokenReceived';
var REMOTE_NOTIFICATION_OPENED = 'remoteNotificationOpened';
var PushNotification = /** @class */ (function () {
    function PushNotification(config) {
        if (config) {
            this.configure(config);
        }
        else {
            this._config = {};
        }
        this.handlers = [];
        this.updateEndpoint = this.updateEndpoint.bind(this);
        this.handleCampaignPush = this.handleCampaignPush.bind(this);
        this.handleCampaignOpened = this.handleCampaignOpened.bind(this);
        this._checkIfOpenedByCampaign = this._checkIfOpenedByCampaign.bind(this);
        this._currentState = react_native_1.AppState.currentState;
        this._androidInitialized = false;
        this._iosInitialized = false;
        if (react_native_1.Platform.OS === 'ios') {
            react_native_1.AppState.addEventListener('change', this._checkIfOpenedByCampaign, false);
        }
    }
    PushNotification.prototype.getModuleName = function () {
        return "Pushnotification";
    };
    PushNotification.prototype.configure = function (config) {
        var conf = config ? config.PushNotification || config : {};
        if (conf['aws_mobile_analytics_app_id']) {
            conf = {
                appId: conf['aws_mobile_analytics_app_id'],
            };
        }
        this._config = Object.assign({}, this._config, conf);
        if (react_native_1.Platform.OS === 'android' && !this._androidInitialized) {
            this.initializeAndroid();
            this._androidInitialized = true;
        }
        else if (react_native_1.Platform.OS === 'ios' && !this._iosInitialized) {
            this.initializeIOS();
            this._iosInitialized = true;
        }
    };
    PushNotification.prototype.onNotification = function (handler) {
        if (typeof handler === 'function') {
            // check platform
            if (react_native_1.Platform.OS === 'ios') {
                this.addEventListenerForIOS(REMOTE_NOTIFICATION_RECEIVED, handler);
            }
            else {
                this.addEventListenerForAndroid(REMOTE_NOTIFICATION_RECEIVED, handler);
            }
        }
    };
    PushNotification.prototype.onNotificationOpened = function (handler) {
        if (typeof handler === 'function') {
            // check platform
            if (react_native_1.Platform.OS === 'android') {
                this.addEventListenerForAndroid(REMOTE_NOTIFICATION_OPENED, handler);
            }
        }
    };
    PushNotification.prototype.onRegister = function (handler) {
        if (typeof handler === 'function') {
            // check platform
            if (react_native_1.Platform.OS === 'ios') {
                this.addEventListenerForIOS(REMOTE_TOKEN_RECEIVED, handler);
            }
            else {
                this.addEventListenerForAndroid(REMOTE_TOKEN_RECEIVED, handler);
            }
        }
    };
    PushNotification.prototype.initializeAndroid = function () {
        this.addEventListenerForAndroid(REMOTE_TOKEN_RECEIVED, this.updateEndpoint);
        this.addEventListenerForAndroid(REMOTE_NOTIFICATION_OPENED, this.handleCampaignOpened);
        this.addEventListenerForAndroid(REMOTE_NOTIFICATION_RECEIVED, this.handleCampaignPush);
        RNPushNotification.initialize();
    };
    PushNotification.prototype.initializeIOS = function () {
        push_notification_ios_1.default.requestPermissions({
            alert: true,
            badge: true,
            sound: true
        });
        this.addEventListenerForIOS(REMOTE_TOKEN_RECEIVED, this.updateEndpoint);
        this.addEventListenerForIOS(REMOTE_NOTIFICATION_RECEIVED, this.handleCampaignPush);
    };
    PushNotification.prototype._checkIfOpenedByCampaign = function (nextAppState) {
        var _this = this;
        // the app is turned from background to foreground	            
        if (this._currentState.match(/inactive|background/) && nextAppState === 'active') {
            push_notification_ios_1.default.getInitialNotification().then(function (data) {
                if (data) {
                    _this.handleCampaignOpened(data);
                }
            }).catch(function (e) {
                logger.debug('Failed to get the initial notification.', e);
            });
        }
        ;
        this._currentState = nextAppState;
    };
    PushNotification.prototype.handleCampaignPush = function (rawMessage) {
        var message = rawMessage;
        var campaign = null;
        if (react_native_1.Platform.OS === 'ios') {
            message = this.parseMessageFromIOS(rawMessage);
            campaign = message && message.data && message.data.pinpoint ? message.data.pinpoint.campaign : null;
        }
        else if (react_native_1.Platform.OS === 'android') {
            var data = rawMessage.data;
            campaign = {
                campaign_id: data['pinpoint.campaign.campaign_id'],
                campaign_activity_id: data['pinpoint.campaign.campaign_activity_id'],
                treatment_id: data['pinpoint.campaign.treatment_id']
            };
        }
        if (!campaign) {
            logger.debug('no message received for campaign push');
            return;
        }
        var attributes = {
            campaign_activity_id: campaign['campaign_activity_id'],
            isAppInForeground: message.foreground ? 'true' : 'false',
            treatment_id: campaign['treatment_id'],
            campaign_id: campaign['campaign_id']
        };
        var eventType = (message.foreground) ? '_campaign.received_foreground' : '_campaign.received_background';
        if (core_1.default.Analytics && typeof core_1.default.Analytics.record === 'function') {
            core_1.default.Analytics.record({
                name: eventType,
                attributes: attributes,
                immediate: true
            });
        }
        else {
            logger.debug('Analytics module is not registered into Amplify');
        }
    };
    PushNotification.prototype.handleCampaignOpened = function (rawMessage) {
        logger.debug('handleCampaignOpened, raw data', rawMessage);
        var campaign = null;
        if (react_native_1.Platform.OS === 'ios') {
            var message = this.parseMessageFromIOS(rawMessage);
            campaign = message && message.data && message.data.pinpoint ? message.data.pinpoint.campaign : null;
        }
        else if (react_native_1.Platform.OS === 'android') {
            var data = rawMessage;
            campaign = {
                campaign_id: data['pinpoint.campaign.campaign_id'],
                campaign_activity_id: data['pinpoint.campaign.campaign_activity_id'],
                treatment_id: data['pinpoint.campaign.treatment_id']
            };
        }
        if (!campaign) {
            logger.debug('no message received for campaign opened');
            return;
        }
        var attributes = {
            campaign_activity_id: campaign['campaign_activity_id'],
            treatment_id: campaign['treatment_id'],
            campaign_id: campaign['campaign_id']
        };
        var eventType = '_campaign.opened_notification';
        if (core_1.default.Analytics && typeof core_1.default.Analytics.record === 'function') {
            core_1.default.Analytics.record({
                name: eventType,
                attributes: attributes,
                immediate: true
            });
        }
        else {
            logger.debug('Analytics module is not registered into Amplify');
        }
    };
    PushNotification.prototype.updateEndpoint = function (token) {
        if (!token) {
            logger.debug('no device token recieved on register');
            return;
        }
        var appId = this._config.appId;
        var cacheKey = 'push_token' + appId;
        logger.debug('update endpoint in push notification', token);
        react_native_1.AsyncStorage.getItem(cacheKey).then(function (lastToken) {
            if (!lastToken || lastToken !== token) {
                logger.debug('refresh the device token with', token);
                var config = {
                    Address: token,
                    OptOut: 'NONE'
                };
                if (core_1.default.Analytics && typeof core_1.default.Analytics.updateEndpoint === 'function') {
                    core_1.default.Analytics.updateEndpoint(config).then(function (data) {
                        logger.debug('update endpoint success, setting token into cache');
                        react_native_1.AsyncStorage.setItem(cacheKey, token);
                    }).catch(function (e) {
                        // ........
                        logger.debug('update endpoint failed', e);
                    });
                }
                else {
                    logger.debug('Analytics module is not registered into Amplify');
                }
            }
        }).catch(function (e) {
            logger.debug('set device token in cache failed', e);
        });
    };
    // only for android
    PushNotification.prototype.addEventListenerForAndroid = function (event, handler) {
        var that = this;
        var listener = react_native_1.DeviceEventEmitter.addListener(event, function (data) {
            // for on notification
            if (event === REMOTE_NOTIFICATION_RECEIVED) {
                handler(that.parseMessagefromAndroid(data));
                return;
            }
            if (event === REMOTE_TOKEN_RECEIVED) {
                var dataObj = data.dataJSON ? JSON.parse(data.dataJSON) : {};
                handler(dataObj.refreshToken);
                return;
            }
            if (event === REMOTE_NOTIFICATION_OPENED) {
                handler(that.parseMessagefromAndroid(data, 'opened'));
                return;
            }
        });
    };
    PushNotification.prototype.addEventListenerForIOS = function (event, handler) {
        var that = this;
        if (event === REMOTE_TOKEN_RECEIVED) {
            push_notification_ios_1.default.addEventListener('register', function (data) {
                handler(data);
            });
        }
        if (event === REMOTE_NOTIFICATION_RECEIVED) {
            push_notification_ios_1.default.addEventListener('notification', handler);
        }
    };
    PushNotification.prototype.parseMessagefromAndroid = function (message, from) {
        var dataObj = null;
        try {
            dataObj = message.dataJSON ? JSON.parse(message.dataJSON) : null;
        }
        catch (e) {
            logger.debug('Failed to parse the data object', e);
            return;
        }
        if (!dataObj) {
            logger.debug('no notification payload received');
            return dataObj;
        }
        if (from === 'opened') {
            return dataObj;
        }
        var ret = null;
        var dataPayload = dataObj.data;
        if (dataPayload['pinpoint.campaign.campaign_id']) {
            ret = {
                title: dataPayload['pinpoint.notification.title'],
                body: dataPayload['pinpoint.notification.body'],
                data: dataPayload,
                foreground: dataObj.foreground
            };
        }
        return ret;
    };
    PushNotification.prototype.parseMessageFromIOS = function (message) {
        var _data = message && message._data ? message._data : null;
        var _alert = message && message._alert ? message._alert : {};
        if (!_data && !_alert) {
            logger.debug('no notification payload received');
            return {};
        }
        var data = _data.data;
        var title = _alert.title;
        var body = _alert.body;
        var ret = null;
        ret = {
            title: title,
            body: body,
            data: data
        };
        return ret;
    };
    return PushNotification;
}());
exports.default = PushNotification;
//# sourceMappingURL=PushNotification.js.map