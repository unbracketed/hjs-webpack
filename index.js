var fs = require('fs')
var path = require('path')
var webpack = require('webpack')
var findRoot = require('find-root')
var defaults = require('lodash.defaults')
var getBaseConfig = require('./lib/base-config')
var getPackage  = require('./lib/get-package')

var PWD = process.env.PWD

module.exports = function (opts) {
  checkRequired(opts)
  var rootFolder = opts.rootFolder || findRoot(PWD)
  var outputFolder = path.resolve(opts.out)
  var indexHtmlPath = path.join(rootFolder, 'index.html')
  var outputHtmlFile = path.join(outputFolder, 'index.html')

  // add in our defaults
  var spec = defaults(opts, {
    entry: path.resolve(opts.in),
    output: {
      path: outputFolder + '/',
      filename: null
    },
    configFile: null,
    isDev: true,
    package: null,
    replace: null
  })

  spec.package = getPackage(spec.package)

  if (!spec.output.filename) {
    spec.output.filename = spec.isDev ? 'app.js' : buildFilename(spec.package)
  }

  if (spec.isDev && !fs.existsSync(indexHtmlPath)) {
    console.log('creating needed index.html file in' + indexHtmlPath)
    fs.writeFileSync(indexHtmlPath, getHTML(spec.output.filename), 'utf8')
  }

  var config = getBaseConfig(spec)

  // check for any module replacements
  if (spec.replace) {
    for (var regex in spec.replace) {
      // allow for simple strings
      if (typeof regex === 'string') {
        regex = new RegExp('^' + regex + '$')
      }
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(regex, spec.replace[regex]))
    }
  }

  // dev specific stuff
  if (spec.isDev) {
    // debugging option
    config.devtool = 'eval'

    // add dev server and hotloading clientside code
    config.entry.unshift(
      'webpack-dev-server/client?http://0.0.0.0:3000',
      'webpack/hot/only-dev-server'
    )

    // add dev plugins
    config.plugins = config.plugins.concat([
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoErrorsPlugin()
    ])

    // add react-hot as module loader
    config.module.loaders[0].loaders.unshift('react-hot')
  } else {
    // minify in production
    config.plugins = config.plugins.concat([
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        },
        sourceMap: false
      })
    ])
  }

  return config
}

function buildFilename (pack) {
  return [
    pack.name,
    pack.version,
    'js'
  ].join('.')
}

function getHTML (name) {
  return '<!doctype>\n<!-- webpack dev server needs this file while running. feel free to .gitignore -->\n<script src="' + name + '"></script>'
}

function checkRequired (opts) {
  var props = ['out', 'in', 'isDev']
  if (!opts || !props.every(function (prop) { return opts.hasOwnProperty(prop) })) {
    throw new Error('Must pass in options with `in`, `out`, and `isDev` properties')
  }
}