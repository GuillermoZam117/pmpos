const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
    mode: 'development', // Changed to development mode
    entry: path.resolve(__dirname, 'app', 'index.jsx'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].js',
        publicPath: '/'
    },
    devtool: 'source-map', // Added source maps for debugging
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        hot: true,
        port: 8080,
        historyApiFallback: true,
        proxy: {
            '/api': 'http://localhost:9000',
            '/Token': {
                target: 'http://localhost:9000',
                pathRewrite: { '^/Token': '/token' }
            },
            '/signalr': 'http://localhost:9000'
        }
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                        plugins: [
                            '@babel/plugin-transform-runtime',
                            'react-hot-loader/babel' // Added for hot reload
                        ],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'], // Changed for development
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
        }),
        new HtmlWebpackPlugin({
            template: './app/index.html',
            favicon: './public/favicon.ico'
        }),
        new Dotenv({
            path: './.env',
            safe: true,
            systemvars: true,
            silent: true,
            defaults: false
        }),
        new CopyWebpackPlugin({
            patterns: [
                { 
                    from: 'app/assets/favicon.ico', 
                    to: 'favicon.ico' 
                }
            ],
        }),
        // Commented out Bundle Analyzer
        // new BundleAnalyzerPlugin(),
    ],
    resolve: {
        alias: {
            'react-dom': '@hot-loader/react-dom' // Added for hot reload
        },
        extensions: ['.js', '.jsx']
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name(module) {
                        const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                        return `vendor.${packageName.replace('@', '')}`;
                    },
                },
            },
        },
        runtimeChunk: 'single'
    },
    performance: {
        hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
    stats: {
        errorDetails: true,
        children: true
    }
};