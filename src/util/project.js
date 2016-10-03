function getProjectDir() {
    var project = atom.project;
    var directories = project.getDirectories();
    if (directories && directories.length) {
        return directories[0].getPath();
    }
    return __dirname;
}

exports.getProjectDir = getProjectDir;