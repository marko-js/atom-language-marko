const { AutoLanguageClient } = require("atom-languageclient");
const { install } = require("atom-package-deps");

module.exports = new (class MarkoLanguageClient extends AutoLanguageClient {
  getConnectionType() {
    return "ipc";
  }
  getGrammarScopes() {
    return ["text.marko"];
  }
  getLanguageName() {
    return "Marko";
  }
  getServerName() {
    return "Marko LSP";
  }
  preInitialization(connection) {
    connection.onCustom('$/displayError', msg => {
      atom.notifications.addError(msg);
    });

    connection.onCustom('$/displayWarning', msg => {
      atom.notifications.addWarning(msg);
    });

    connection.onCustom('$/displayInfo', msg => {
      atom.notifications.addInfo(msg);
    });
  }
  provideAutocomplete() {
    const provided = super.provideAutocomplete();
    provided.suggestionPriority = 2;
    return provided;
  }
  async startServerProcess() {
    const [server] = await Promise.all([
      super.spawnChildNode(
        [require.resolve("@marko/language-server"), "--node-ipc"],
        {
          stdio: [null, null, null, "ipc"],
        }
      ),
      install("language-marko", true)
    ]);

    return server;
  }
})();
