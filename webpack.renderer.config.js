const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
  test: /\.scss$/,
  use: ['style-loader', 'css-loader', 'sass-loader']
});

rules.push({
  test: /\.(jpe?g|png|gif|svg|ico|json|ttf)$/i,
  loader: 'file-loader',
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
};
