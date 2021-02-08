import { AutoLanguageClient, LanguageServerProcess } from "atom-languageclient";
import { install } from "atom-package-deps";

export = new (class MarkoLanguageClient extends AutoLanguageClient {
  getConnectionType() {
    return "ipc" as const;
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
      (window as any).atom.notifications.addError(msg);
    });

    connection.onCustom('$/displayWarning', msg => {
      (window as any).atom.notifications.addWarning(msg);
    });

    connection.onCustom('$/displayInfo', msg => {
      (window as any).atom.notifications.addInfo(msg);
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
      ) as LanguageServerProcess,
      install("language-marko", true)
    ]);

    return server;
  }
})();
