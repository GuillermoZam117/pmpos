module.exports = {
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
        '@babel/plugin-transform-runtime',
        'react-hot-loader/babel'
    ]
};