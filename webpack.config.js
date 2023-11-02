const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
  entry: {
    webflow: './src/webflow/main.ts',
    clickfunnels: './src/clickfunnels/main.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  plugins: [
    new webpack.BannerPlugin(
      'This code is intended for private use only. ©2023 Xip Technologies, Inc. All rights reserved.\n\nThis code is proprietary to Xip Technologies, Inc. Unauthorized copying, modification, distribution, or any action in reliance on the contents of this material is strictly prohibited.',
    ),
  ],
};
