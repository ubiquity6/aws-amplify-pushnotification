export default class PushNotification {
    private _config;
    private handlers;
    private _currentState;
    private _androidInitialized;
    private _iosInitialized;
    constructor(config: any);
    getModuleName(): string;
    configure(config: any): void;
    onNotification(handler: any): void;
    onNotificationOpened(handler: any): void;
    onRegister(handler: any): void;
    initializeAndroid(): void;
    initializeIOS(): void;
    _checkIfOpenedByCampaign(nextAppState: any): void;
    handleCampaignPush(rawMessage: any): void;
    handleCampaignOpened(rawMessage: any): void;
    updateEndpoint(token: any): void;
    addEventListenerForAndroid(event: any, handler: any): void;
    addEventListenerForIOS(event: any, handler: any): void;
    parseMessagefromAndroid(message: any, from?: any): any;
    parseMessageFromIOS(message: any): any;
}
