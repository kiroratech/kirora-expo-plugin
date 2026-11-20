const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// @kirora/react-native is linked from a sibling checkout (`file:`). Metro must watch it, and must
// take react/react-native from this app only, never from the linked packages' own node_modules.
const sdkRoot = path.resolve(__dirname, '../../kirora-react-native');
const pluginRoot = path.resolve(__dirname, '..');
const escape = (p) => p.replace(/[/\\^$.*+?()[\]{}|]/g, '\\$&');

const config = getDefaultConfig(__dirname);
config.watchFolders = [sdkRoot];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.blockList = [
  new RegExp(`^${escape(sdkRoot)}/(node_modules|example)/.*`),
  new RegExp(`^${escape(pluginRoot)}/node_modules/.*`)
];

module.exports = config;
