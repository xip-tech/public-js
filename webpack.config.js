const path = require('path');

module.exports = {
    mode: process.env.NODE_ENV || 'development',
    devtool: 'source-map',
    entry: {
        webflow: './src/webflow/main.ts',
        clickfunnels: './src/clickfunnels/main.ts'
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
};
