const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

exports.indexTemplate = function (options) {
  return {
    plugins: [
      new HtmlWebpackPlugin({
        template: 'default_index.ejs',
        title: options.title,
        appMountId: options.appMountId,
        mobile: true,
        inject: true
      })
    ]
  };
};

exports.loadJSX = function (include) {
  return {
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          use: ['babel-loader'],
          include: include
        }
      ]
    }
  };
};

exports.loadJSON = function () {
  return {
    module: {
      rules: [
        {
          test: /\.json$/,
          use: ['json-loader']
        }
      ]
    }
  };
};

exports.lintJSX = function (include) {
  return {
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          use: ['eslint-loader'],
          include: include
        }
      ]
    }
  };
};

exports.devServer = function (options) {
  return {
    devServer: {
      historyApiFallback: true,
      hot: true,
      client: {
        overlay: { // Used instead of 'stats' to control the overlay on the browser when there are compiler errors or warnings
          errors: true,
          warnings: false,
        },
      },
      host: options.host || 'localhost',
      port: options.port || 8080,
      static: {
        directory: path.join(__dirname, 'public'), // Specify the static file location
      }
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin() // Make sure hot module replacement is enabled
    ]
  };
};


exports.setupCSS = function (paths) {
  return {
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
          include: paths
        }
      ]
    }
  };
};

exports.loadSass = function () {
  return {
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'sass-loader'
          ]
        }
      ]
    }
  };
};

exports.minify = function () {
  return {
    optimization: {
      minimizer: [new TerserPlugin({
        terserOptions: {
          compress: {
            comparisons: false,
          },
          mangle: {
            safari10: true,
          },
        },
      })]
    }
  };
};

exports.extractCSS = function (paths) {
  return {
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css'
      })
    ]
  };
};

exports.clean = function (path) {
  return {
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [path]
      })
    ]
  };
};
