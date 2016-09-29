const markoCompilerCache = {};
const resolveFrom = require('resolve-from');
const lassoPackageRoot = require('lasso-package-root');
const defaultMarkoCompiler = require('marko/compiler');

function loadMarkoCompiler(dir) {
    let rootDir = lassoPackageRoot.getRootDir(dir);
    let markoCompiler = markoCompilerCache[rootDir];
    if (!markoCompiler) {
        let markoCompilerPath = resolveFrom(rootDir, 'marko/compiler');
        if (markoCompilerPath) {
            markoCompiler = require(markoCompilerPath);
        }
        markoCompilerCache[rootDir] = markoCompiler = markoCompiler || defaultMarkoCompiler;
    }

    return markoCompiler;
}

function clearCache() {
    for (let dir in markoCompilerCache) {
        let markoCompiler = markoCompilerCache[dir];
        markoCompiler.clearCaches();
    }
}

exports.loadMarkoCompiler = loadMarkoCompiler;
exports.clearCache = clearCache;
exports.defaultMarkoCompiler = defaultMarkoCompiler;