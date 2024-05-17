const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode: 'development', // Change to 'production' for production build
    entry: path.resolve(__dirname, 'app', 'index.jsx'),  // ensure the entry point is correct
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css'
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'app', 'index.html'),  // ensure this path is correct
            filename: 'index.html'
        })
    ],
    resolve: {
        extensions: ['.js', '.jsx']  // handle .js and .jsx files
    },
    devServer: {
        static: path.resolve(__dirname, 'public'),
        compress: true,
        port: 8080,
        open: true,
        hot: true
    }
};
