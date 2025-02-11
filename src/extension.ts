import * as vscode from "vscode";
import { addConnection, removeConnection } from "./file";
import * as server from "./server";

async function updateDocument(
  document: vscode.TextDocument,
  text: string,
  selections: { start: number; end: number }[]
) {
  if (!document.isClosed) {
    const editor = await vscode.window.showTextDocument(document);
    await editor.edit((editBuilder) => {
      const range = new vscode.Range(
        new vscode.Position(0, 0),
        document.lineAt(document.lineCount - 1).range.end
      );
      editBuilder.replace(range, text);
    });
    if (selections.length) {
      editor.selections = selections.map(
        (selection) =>
          new vscode.Selection(
            document.positionAt(selection.start),
            document.positionAt(selection.end)
          )
      );
    }
  }
}

async function closeDocument(document: vscode.TextDocument) {
  if (!document.isClosed) {
    await updateDocument(document, "", []);
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  }
}

export const activate = (context: vscode.ExtensionContext) => {
  console.log("extension activate");

  server.listen(async (conn) => {
    addConnection();

    const disposables: vscode.Disposable[] = [];
    let document: vscode.TextDocument | null = null;
    let enterLocalEdit = 0;

    conn.on("data", async (data) => {
      console.log("receive data");

      if (!document) {
        document = await vscode.workspace.openTextDocument({
          language: "markdown",
          content: data.text,
        });

        const cleanup = () => {
          disposables.forEach((d) => d.dispose());
          conn.close();
          if (document) {
            closeDocument(document);
          }
        };

        conn.on("close", async () => {
          await removeConnection();
          cleanup();
        });

        disposables.push(
          vscode.workspace.onDidCloseTextDocument((doc) => {
            if (doc === document && doc.isClosed) {
              console.log("document close");
              cleanup();
            }
          })
        );

        disposables.push(
          vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (event.document === document) {
              if (enterLocalEdit === 0) {
                const text = event.document.getText();
                const editor = await vscode.window.showTextDocument(
                  event.document
                );
                const selections = editor.selections.map((selection) => ({
                  start: event.document.offsetAt(selection.start),
                  end: event.document.offsetAt(selection.end),
                }));
                conn.send(text, selections);
              }
            }
          })
        );
      }

      enterLocalEdit++;
      try {
        await updateDocument(document, data.text, data.selections || []);
      } finally {
        enterLocalEdit--;
      }
    });
  });
};

export const deactivate = () => {
  server.close();
};
