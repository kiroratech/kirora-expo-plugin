/** Options of `["@kirora/expo-plugin", { ... }]` in the app config. All are optional. */
export interface KiroraPluginProps {
  /**
   * iOS `aps-environment` in the app's entitlements. Default `development`. Exporting for
   * distribution (any EAS build, TestFlight, App Store) rewrites it to `production`, so it only
   * decides builds run straight from Xcode or `npx expo run:ios`.
   */
  mode?: 'development' | 'production';

  android?: {
    /**
     * Path, from the project root, to the notification's small icon: a white-on-transparent
     * PNG, ideally 96×96. Becomes the `kirora_notification_icon` drawable and the default icon
     * of Kirora pushes. Without it Kirora uses FCM's `default_notification_icon`, if set, then
     * the launcher icon, usually a white square.
     */
    icon?: string;
    /** Accent colour of Kirora pushes, `#RRGGBB`. */
    color?: string;
  };

  ios?: {
    /**
     * Add the Notification Service Extension that gives Kirora pushes delivery reports, images
     * and buttons. Default `true`.
     */
    notificationServiceExtension?: boolean;
    /**
     * The extension's deployment target, also used as its Podfile platform. Default: the app
     * config's `ios.deploymentTarget`, else `15.1`, Expo's own minimum.
     */
    deploymentTarget?: string;
    /**
     * Your `apiUrl` option, when you set one: the extension can't read the app's options, so it
     * gets the address in its Info.plist (`KiroraApiUrl`).
     */
    apiUrl?: string;
    /** Apple team that signs the extension. Default: `ios.appleTeamId` of the app config. */
    appleTeamId?: string;
    /**
     * Development only: a local checkout of kirora-ios, used for the `Kirora` and
     * `KiroraNotificationService` pods in place of released versions.
     */
    localSdkPath?: string;
  };
}

export const NSE_TARGET_NAME = 'KiroraNotificationService';
export const ANDROID_ICON_NAME = 'kirora_notification_icon';
export const ANDROID_COLOR_NAME = 'kirora_notification_color';
