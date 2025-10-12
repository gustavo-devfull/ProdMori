const { override, addWebpackPlugin } = require('customize-cra');
const webpack = require('webpack');

module.exports = override(
  addWebpackPlugin(
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.GENERATE_SOURCEMAP': JSON.stringify('false'),
    })
  ),
  // Configurações para melhorar a estabilidade do HMR
  (config) => {
    // Desabilitar source maps em desenvolvimento para reduzir problemas de DOM
    if (process.env.NODE_ENV === 'development') {
      config.devtool = false;
    }
    
    // Configurações do dev server
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
      };
    }
    
    // Configurações para resolver problemas de CSS dinâmico
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
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
          },
        },
      },
    };
    
    return config;
  }
);
