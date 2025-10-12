const { override, addWebpackPlugin } = require('customize-cra');
const webpack = require('webpack');

module.exports = override(
  addWebpackPlugin(
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.GENERATE_SOURCEMAP': JSON.stringify('false'),
    })
  ),
  // Configurações para resolver problemas de DOM e CSS dinâmico
  (config) => {
    // Desabilitar source maps em desenvolvimento para reduzir problemas de DOM
    if (process.env.NODE_ENV === 'development') {
      config.devtool = false;
    }
    
    // Configurações do dev server para estabilidade
    if (config.devServer) {
      config.devServer.hot = true;
      config.devServer.liveReload = false;
      config.devServer.client = {
        overlay: {
          errors: true,
          warnings: false,
        },
        webSocketURL: {
          hostname: 'localhost',
          port: 3000,
          pathname: '/ws',
        },
        logging: 'warn', // Reduzir logs verbosos
      };
      
      // Configurações adicionais para estabilidade
      config.devServer.historyApiFallback = {
        disableDotRule: true,
      };
      
      config.devServer.static = {
        directory: config.devServer.static?.directory || './public',
        publicPath: '/',
      };
    }
    
    // Configurações para resolver problemas de CSS dinâmico
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
            enforce: true,
          },
          antd: {
            test: /[\\/]node_modules[\\/]antd[\\/]/,
            name: 'antd',
            priority: 10,
            chunks: 'all',
            enforce: true,
          },
        },
      },
      // Desabilitar minimização em desenvolvimento para debug
      minimize: process.env.NODE_ENV === 'production',
    };
    
    // Configurações para resolver problemas de módulos Node.js
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        "buffer": false,
        "fs": false,
        "net": false,
        "tls": false,
        "crypto": false,
        "stream": false,
        "util": false,
        "zlib": false,
        "path": false,
        "os": false,
      },
    };
    
    // Usar configurações CSS padrão do Create React App
    
    // Configurações para melhorar performance e estabilidade
    config.performance = {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    };
    
    return config;
  }
);
