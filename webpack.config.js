const webpack = require('webpack');
const os = require('os');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// Load env per mode to avoid picking root .env in dev
const dotenv = require('dotenv');

// Default to development if not explicitly set
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envFile) });

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    const localIPv4 = (() => {
        try {
            const ifaces = os.networkInterfaces();
            for (const name of Object.keys(ifaces)) {
                for (const iface of ifaces[name] || []) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        return iface.address;
                    }
                }
            }
        } catch (_) {}
        return 'localhost';
    })();
    const autoApiBase = `http://${localIPv4}:9000`;
    
    // Define environment variables for DefinePlugin
    // Dev: forzar IP local como base para evitar quedarnos con una IP vieja del .env
    const effectiveApi = isProduction
        ? (process.env.SAMBAPOS_API_URL || env.SAMBAPOS_API_URL || autoApiBase)
        : autoApiBase;

    const envKeys = {
        'process.env': JSON.stringify({
            NODE_ENV: NODE_ENV,
            API_URL: effectiveApi,
            // Core Samba endpoints
            SAMBAPOS_API_URL: effectiveApi,
            SAMBAPOS_GRAPHQL_URL: `${effectiveApi}/api/graphql`,
            SAMBAPOS_TOKEN_URL: `${effectiveApi}/Token`,
            // Auth
            SAMBAPOS_USERNAME: process.env.SAMBAPOS_USERNAME || env.USER_NAME,
            SAMBAPOS_PASSWORD: process.env.SAMBAPOS_PASSWORD || env.PASSWORD,
            SAMBAPOS_CLIENT_ID: process.env.SAMBAPOS_CLIENT_ID || env.CLIENT_ID,
            // Business names (Discovery)
            SAMBAPOS_TERMINAL: process.env.SAMBAPOS_TERMINAL,
            SAMBAPOS_DEPARTMENT: process.env.SAMBAPOS_DEPARTMENT,
            SAMBAPOS_TICKET_TYPE: process.env.SAMBAPOS_TICKET_TYPE,
            SAMBAPOS_ENTITY_SCREEN: process.env.SAMBAPOS_ENTITY_SCREEN,
            SAMBAPOS_ENTITY_TYPE: process.env.SAMBAPOS_ENTITY_TYPE,
            // Automation and labels
            SAMBAPOS_SUBMIT_ORDERS_COMMAND: process.env.SAMBAPOS_SUBMIT_ORDERS_COMMAND,
            SAMBAPOS_PRINT_ACCOUNT_COMMAND: process.env.SAMBAPOS_PRINT_ACCOUNT_COMMAND,
            SAMBAPOS_PRINT_JOB_NAME: process.env.SAMBAPOS_PRINT_JOB_NAME,
            SAMBAPOS_ORDER_COMMENT_COMMAND: process.env.SAMBAPOS_ORDER_COMMENT_COMMAND,
            SAMBAPOS_AUTOCMD_GIFT: process.env.SAMBAPOS_AUTOCMD_GIFT,
            SAMBAPOS_AUTOCMD_VOID: process.env.SAMBAPOS_AUTOCMD_VOID,
            SAMBAPOS_LABEL_SUBMIT: process.env.SAMBAPOS_LABEL_SUBMIT,
            SAMBAPOS_LABEL_PRINT_BILL: process.env.SAMBAPOS_LABEL_PRINT_BILL,
            SAMBAPOS_LABEL_PAY: process.env.SAMBAPOS_LABEL_PAY,
            // Hybrid read-service feature flag and internal API key
            // Default: enable SQL reads in production unless explicitly disabled
            REACT_APP_USE_SQL_READS: process.env.REACT_APP_USE_SQL_READS || (isProduction ? 'true' : 'false'),
            READ_SERVICE_URL: process.env.READ_SERVICE_URL || env.READ_SERVICE_URL,
            READ_SERVICE_APIKEY: process.env.READ_SERVICE_APIKEY || env.READ_SERVICE_APIKEY,
            INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || 'local-test-key',
            REACT_APP_SEND_INTERNAL_KEY: process.env.REACT_APP_SEND_INTERNAL_KEY || 'false',
            // Disable GraphQL read fallbacks by default
            REACT_APP_ALLOW_GQL_READ_FALLBACK: process.env.REACT_APP_ALLOW_GQL_READ_FALLBACK || 'false'
        })
    };

    return {
        mode: isProduction ? 'production' : 'development',
        entry: './app/index.jsx',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].[contenthash].js',
            publicPath: '/',
            assetModuleFilename: 'assets/[name][ext]'
        },
        devtool: 'source-map', // Added source maps for debugging
        devServer: {
            static: {
                directory: path.join(__dirname, 'public'),
            },
            hot: true,
            port: 8081,
            headers: {
                'Cache-Control': 'no-store',
            },
            historyApiFallback: true,
            setupMiddlewares: (middlewares, devServer) => {
                if (!devServer) {
                    throw new Error('webpack-dev-server is not defined');
                }
                // Lightweight client→server logging endpoint (GET only, no body parser needed)
                devServer.app.get('/__log', (req, res) => {
                    const q = req.query || {};
                    const level = (q.level || 'log').toString();
                    const tag = (q.tag || '').toString();
                    const msg = (q.msg || '').toString();
                    const line = `[client:${level}] ${tag ? tag + ' - ' : ''}${msg}`;
                    // Print to terminal
                    if (level === 'error') console.error(line);
                    else if (level === 'warn') console.warn(line);
                    else if (level === 'info') console.info(line);
                    else console.log(line);
                    res.status(204).end();
                });
                return middlewares;
            },
            proxy: {
                '/api': {
                    target: effectiveApi,
                    pathRewrite: { '^/api': '/api' },
                    changeOrigin: true,
                    secure: false,
                    onProxyReq: (proxyReq, req) => {
                        // Add debugging for proxy requests
                        console.log('🔄 Proxy Request:', {
                            path: proxyReq.path,
                            headers: proxyReq.getHeaders(),
                            method: proxyReq.method
                        });
                    },
                    onProxyRes: (proxyRes, req) => {
                        // Add debugging for proxy responses
                        console.log('📥 Proxy Response:', {
                            status: proxyRes.statusCode,
                            headers: proxyRes.headers
                        });
                    }
                },
                '/Token': {
                    target: effectiveApi,
                    changeOrigin: true,
                    secure: false,
                    onProxyReq: (proxyReq) => {
                        console.log('🔑 Token Request:', proxyReq.path);
                    }
                },
                '/signalr': {
                    target: effectiveApi,
                    changeOrigin: true,
                    secure: false
                },
                // Read-service (SQL) proxy for dev with header injection
                '/internal-api': {
                    target: process.env.READ_SERVICE_URL || 'http://localhost:4005',
                    changeOrigin: true,
                    secure: false,
                    headers: {
                        'X-INTERNAL-API-KEY': process.env.READ_SERVICE_APIKEY || process.env.INTERNAL_API_KEY || 'local-test-key',
                        'apikeyAuth': process.env.READ_SERVICE_APIKEY || process.env.INTERNAL_API_KEY || 'local-test-key'
                    },
                    onProxyReq: (proxyReq) => {
                        console.log('🧩 Read-service Request:', proxyReq.path);
                    },
                    onProxyRes: (proxyRes) => {
                        console.log('🧩 Read-service Response:', proxyRes.statusCode);
                    }
                }
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
                {
                    test: /\.(ico|png|jpg|gif)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/[name][ext]'
                    }
                }
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
            new CopyWebpackPlugin({
                patterns: [
                    { 
                        from: 'public/favicon.ico',
                        to: 'assets' 
                    },
                    {
                        from: 'app/assets',
                        to: 'assets'
                    }
                ],
            }),
            new webpack.DefinePlugin(envKeys),
            new webpack.ProvidePlugin({
                process: 'process/browser',
                Buffer: ['buffer', 'Buffer']
            })
        ],
        resolve: {
            alias: {
                'react-dom': '@hot-loader/react-dom',
                '@assets': path.resolve(__dirname, 'public')
            },
            extensions: ['.js', '.jsx'],
            fallback: {
                "path": require.resolve("path-browserify"),
                "fs": false,
                "process": require.resolve("process/browser")
            }
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
                maxInitialRequests: 10, // Reduced from Infinity
                minSize: 20000,
                maxSize: 200000, // Max chunk size to force splitting
                cacheGroups: {
                    // Core React ecosystem
                    react: {
                        test: /[\\/]node_modules[\\/](react|react-dom|react-redux|redux)[\\/]/,
                        name: 'vendor.react',
                        priority: 50,
                        chunks: 'all',
                    },
                    // MUI Core (split into smaller chunks)
                    muiCore: {
                        test: /[\\/]node_modules[\\/]@mui[\\/](material|system|utils)[\\/]/,
                        name: 'vendor.mui-core',
                        priority: 40,
                        chunks: 'all',
                    },
                    // MUI Icons & Lab (separate chunk)
                    muiExtras: {
                        test: /[\\/]node_modules[\\/]@mui[\\/](icons-material|lab)[\\/]/,
                        name: 'vendor.mui-extras',
                        priority: 39,
                        chunks: 'all',
                    },
                    // Emotion (MUI's CSS-in-JS dependency)
                    emotion: {
                        test: /[\\/]node_modules[\\/]@emotion[\\/]/,
                        name: 'vendor.emotion',
                        priority: 38,
                        chunks: 'all',
                    },
                    // Apollo/GraphQL
                    apollo: {
                        test: /[\\/]node_modules[\\/](@apollo|graphql)[\\/]/,
                        name: 'vendor.apollo',
                        priority: 37,
                        chunks: 'all',
                    },
                    // SignalR
                    signalr: {
                        test: /[\\/]node_modules[\\/]@microsoft[\\/]signalr[\\/]/,
                        name: 'vendor.signalr',
                        priority: 36,
                        chunks: 'all',
                    },
                    // Core JS polyfills
                    corejs: {
                        test: /[\\/]node_modules[\\/]core-js[\\/]/,
                        name: 'vendor.core-js',
                        priority: 35,
                        chunks: 'all',
                    },
                    // Immutable.js
                    immutable: {
                        test: /[\\/]node_modules[\\/]immutable[\\/]/,
                        name: 'vendor.immutable',
                        priority: 34,
                        chunks: 'all',
                    },
                    // React Router
                    router: {
                        test: /[\\/]node_modules[\\/](react-router|@remix-run)[\\/]/,
                        name: 'vendor.react-router',
                        priority: 33,
                        chunks: 'all',
                    },
                    // Other common utilities
                    utils: {
                        test: /[\\/]node_modules[\\/](debug|lodash|date-fns|axios)[\\/]/,
                        name: 'vendor.utils',
                        priority: 32,
                        chunks: 'all',
                    },
                    // Default vendor chunk for everything else
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendor.others',
                        priority: 10,
                        chunks: 'all',
                        minChunks: 1,
                    },
                },
            },
            runtimeChunk: 'single'
        },
        performance: {
            hints: isProduction ? 'warning' : false,
            maxEntrypointSize: 600000, // Increased to accommodate current bundle
            maxAssetSize: 300000, // Reduced per-asset limit to encourage splitting
            assetFilter: function(assetFilename) {
                return !/(\.map$)|(assets\/)/.test(assetFilename); // Ignore maps and assets
            }
        },
        stats: {
            errorDetails: true,
            children: true
        }
    };
};
