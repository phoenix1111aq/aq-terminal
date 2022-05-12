require('colors');
const path = require('path');
const webpack = require('webpack');
const copyPlugin = require('copy-webpack-plugin');
const htmlWebpackPlugin = require('html-webpack-plugin');
const removePlugin = require('remove-files-webpack-plugin');

const entryFile = './src/index.tsx';
const bundleFilename = 'index.js';
const tsConfigFile = 'tsconfig.json';
const distFolder = path.join(__dirname, 'dist');

const loaders = {
    tsLoader: {
        test: /\.(tsx|ts)?$/,
        use: [
            {
                loader: 'ts-loader',
                options: { configFile: tsConfigFile }
            }
        ]
    },
    urlLoader: {
        test: /\.(eot|ttf|wav|mp3|png|jpg|jpeg|gif|svg|woff|woff2)$/,
        use: [{ loader: 'url-loader', options: { limit: 0 } }]
    },
    styleLoader: {
        test: /\.[s|]css$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
    }
};

const getModules = () => {
    return { rules: Object.keys(loaders).map((key) => loaders[key]) };
};

const getExtensions = () => {
    return {
        extensions: ['.tsx', '.ts', '.js']
    };
};

const getPlugins = () => {
    return [
        new webpack.ExternalsPlugin('commonjs', ['sqlite', 'sqlite3']),
        /*new copyPlugin({
            patterns: [{ from: './assets/' }]
        }),*/
        new removePlugin({
            before: { include: ['./dist'] },
            after: {
                include: [`./dist/${bundleFilename}.LICENSE.txt`]
            }
        }),
        new htmlWebpackPlugin({
            template: './src/index.html',
            inject: 'body'
        })
    ];
};

module.exports = (env, argv) => {
    const isDev = argv.mode === 'development';
    const mode = isDev ? 'development' : 'production';
    const modeLabel = ` ${mode.toUpperCase()} `.bgRed.white.reset;
    console.log(`Build Mode: ${modeLabel}`);

    let config = {
        mode: mode,
        entry: entryFile,
        target: 'web',
        module: getModules(),
        resolve: getExtensions(),
        plugins: getPlugins(),
        output: {
            path: distFolder,
            filename: bundleFilename,
            sourceMapFilename: `${bundleFilename}.map`
        }
    };

    if (isDev) {
        //On DEV mode, attach dev config to base config
        const devConfig = {
            devtool: 'source-map',
            devServer: {
                hot: true,
                watchFiles: {
                    paths: ['src/**/*'],
                    options: {
                        usePolling: false
                    }
                },
                static: {
                    directory: path.join(__dirname, 'dist')
                },
                compress: true,
                port: 9000,
                client: {
                    progress: true
                }
            }
        };
        config = { ...config, ...devConfig };
    } else {
        //On PRODUCTION mode, attach prod config to base config
        const prodConfig = {
            optimization: {
                innerGraph: false,
                mangleExports: 'size',
                mangleWasmImports: true,
                minimize: true,
                chunkIds: 'total-size'
            }
        };
        config = { ...config, ...prodConfig };
    }
    return config;
};
