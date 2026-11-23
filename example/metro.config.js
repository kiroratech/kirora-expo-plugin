const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// @kirora/expo-plugin is linked from the repository root (`file:..`) for app.config.js only; Metro must
// take react/react-native from this app alone, never from the plugin's own node_modules.
const pluginRoot = path.resolve(__dirname, '..');
const escape = (p) => p.replace(/[/\\^$.*+?()[\]{}|]/g, '\\$&');

const config = getDefaultConfig(__dirname);
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.blockList = [new RegExp(`^${escape(pluginRoot)}/node_modules/.*`)];

module.exports = config;
