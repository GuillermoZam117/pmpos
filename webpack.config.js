const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    
    return {
        mode: isProduction ? 'production' : 'development',
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
                            presets: [
                                ['@babel/preset-env', {
                                    targets: {
                                        node: '14'
                                    },
                                    useBuiltIns: 'usage',
                                    corejs: 3
                                }],
                                '@babel/preset-react'
                            ],
                            plugins: [
                                ['@babel/plugin-transform-runtime', {
                                    regenerator: true
                                }],
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
            new webpack.DefinePlugin({
                'process.env': JSON.stringify({
                    NODE_ENV: isProduction ? 'production' : 'development',
                    DEBUG: isProduction ? false : 'pmpos:*',
                    API_URL: process.env.API_URL || 'http://localhost:9000'
                })
            }),
            new webpack.ProvidePlugin({
                process: 'process/browser',
                Buffer: ['buffer', 'Buffer']
            })
        ],
        resolve: {
            alias: {
                'react-dom': '@hot-loader/react-dom'
            },
            extensions: ['.js', '.jsx'],
            fallback: {
                "path": require.resolve("path-browserify"),
                "fs": false,
                "process": require.resolve("process/browser"),
                "buffer": require.resolve("buffer/")
            }
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
};