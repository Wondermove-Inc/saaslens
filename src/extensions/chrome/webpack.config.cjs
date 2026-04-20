const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode || 'development',
    entry: {
      background: './src/background/index.ts',
      content: './src/content/index.ts',
      popup: './src/popup/index.ts',
      onboarding: './src/onboarding/onboarding.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
        fallback: {
          crypto: false,
          buffer: false,
          stream: false,
          path: false,
          vm: false,
          fs: false,
        },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    devtool: isProduction ? 'source-map' : 'source-map',
    optimization: {
      minimize: isProduction,
    },
    plugins: [
      // 빌드 시 환경 변수 주입 (토큰/URL 자동 포함)
      new webpack.DefinePlugin({
        'process.env.BUILD_API_URL': JSON.stringify(process.env.BUILD_API_URL || 'http://localhost:3000'),
        'process.env.BUILD_API_CREDENTIAL': JSON.stringify(process.env.BUILD_API_CREDENTIAL || ''),
      }),
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: '.' },
          { from: 'public', to: '.' },
          { from: 'src/popup/popup.html', to: 'popup.html' },
          { from: 'src/onboarding/onboarding.html', to: 'onboarding.html' },
          { from: 'policy_templates', to: 'policy_templates' },
        ],
      }),
    ],
  };
};