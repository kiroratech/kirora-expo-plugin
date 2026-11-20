import { type ConfigPlugin, createRunOncePlugin } from 'expo/config-plugins';
import type { KiroraPluginProps } from './types';
import { validateProps } from './validate';
import { withKiroraAndroid } from './withKiroraAndroid';
import { withKiroraIos } from './withKiroraIos';

const pkg = require('../package.json') as { name: string; version: string };

const withKirora: ConfigPlugin<KiroraPluginProps | void> = (config, props) => {
  const options = validateProps(props);
  config = withKiroraAndroid(config, options);
  return withKiroraIos(config, options);
};

export type { KiroraPluginProps } from './types';
export default createRunOncePlugin(withKirora, pkg.name, pkg.version);
